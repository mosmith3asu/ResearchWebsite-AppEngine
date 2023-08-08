import logging
import math
import numpy as np
from itertools import count
from static.PursuitGame.config_manager import CFG
from static.PursuitGame.fun_utils import CPT_Handler, softmax
from static.PursuitGame.make_worlds import WorldDefs
from .fun_utils import dist
class PursuitEvastionGame():
    def __init__(self,iWorld,seed=None):
        ###############################################
        # ENV Properties ##############################
        # Define constant parameters
        self.n_joint_actions = 25
        self.n_ego_actions = 5
        self.n_agents = 2
        self.scale_rcatch = 1.0
        self.scale_penalty = 1.0

        # Import constant parameters
        self.r_catch            = CFG.r_catch
        self.r_penalty          = CFG.r_penalty
        self.p_penalty          = CFG.p_penalty
        self.n_moves            = CFG.n_moves
        self.prey_rationality   = CFG.prey_rationality
        self.prey_dist_power    = CFG.prey_dist_power

        # Define private params
        world = WorldDefs.world[iWorld]
        grid_shape = world.grid_shape
        self._walls             = np.array(world.walls, dtype=int)
        self._start_obs         = np.array(world.start_obs, dtype=int)
        self._penalty_states    = np.array(world.penalty_states, dtype=int)
        self._max_dist          = dist([0,0],grid_shape)
        self._min_pos,self._max_pos = 1,5

        # Define Displays
        self.AGENT_COLOR    = world.AGENT_COLOR
        self.PREY_COLOR     = world.PREY_COLOR
        self.CELL_SIZE      = world.CELL_SIZE
        self.WALL_COLOR     = world.WALL_COLOR
        self.PEN_COLOR      = world.PEN_COLOR
        ###############################################
        # ACTION HANDLERS #############################
        # Define Conversion Functions
        self.action2idx = {'down': 0, 'left': 1, 'up': 2, 'right': 3, 'wait': 4}
        self.idx2action = {v: k for k, v in self.action2idx.items()}
        self.explicit_actions = {'down':  np.array([1, 0]),
                                 'left':  np.array([0, -1]),
                                 'up':    np.array([-1, 0]),
                                 'right': np.array([0, 1]),
                                 'wait':  np.array([0, 0])}

        # Define dynamic variables
        self.step_count     = None
        self.current_positions = None
        self.prey_alive     = None
        self.done           = None
        self.viewer         = None


        # Define GYM enviorment variables
        self.enable_rand_init = False
        self.enable_penalty = CFG.enable_penalty
        self.enable_prey_move = CFG.enable_prey_move
        self.save_rewards_for_end = CFG.save_rewards_for_end
        self.cum_rewards = None

        self.CPT = CPT_Handler()
        self.iCPT_agent = 1
        if seed is not None: self.seed(seed)


    def step(self, joint_action: int):
        assert (self.step_count is not None), "Call reset before using step method."
        info = None
        self.step_count +=1

        rewards = np.zeros([self.n_agents, 1] )
        if self.done:
            logging.warning('Called step when already done')
            return self.current_positions, rewards, self.done, info

        # Simultaneous move of agents
        self.current_positions = self.step_agents(joint_action)
        rewards += self.get_action_reward(self.current_positions)
        self.done = self.check_done()

        # Sequential move of prey
        self.current_positions = self.step_prey()
        rewards += self.get_aux_reward(self.current_positions)
        self.done = self.check_done()

        # Construct env observation
        if self.save_rewards_for_end:
            self.cum_rewards += rewards.copy()
            if self.done: rewards = np.maximum(self.cum_rewards.copy(), np.zeros(rewards.shape))
            else: rewards = np.zeros([self.n_agents, 1])
        return self.observation,rewards,self.done,info

    def step_prey(self):
        q_inadmissable = -1e3
        if self.done: return self.current_positions
        new_positions =  self.current_positions.copy()

        # Decide Prey action
        qA = np.zeros(self.n_ego_actions)
        for ia in range(self.n_ego_actions):
            next_position = self.move(ia, self.current_positions[-1],force_valid_move=False)
            if self.check_valid_state(next_position):
                dist2k = np.zeros([self.n_agents])
                for k in range(self.n_agents):
                    dist2k[k] = dist(self.current_positions[k], next_position)
                qA[ia] = np.linalg.norm(np.abs(np.power(dist2k, self.prey_dist_power)))
            else:  qA[ia] = q_inadmissable

        pA = softmax(self.prey_rationality * qA,axis=0)
        move = np.random.choice(np.arange(pA.size),p=pA)
        if not self.enable_prey_move: move = 4

        # Apply action
        new_positions[-1] = self.move(move,new_positions[-1])
        return new_positions

    def agent2prey_dist(self,*args):
        positions = args[0] if len(args)>=1 else self.current_positions
        dist2k = np.zeros([self.n_agents])
        for k in range(self.n_agents):
            dist2k[k] = dist(positions[k], positions[-1])
        return dist2k

    def step_agents(self,joint_action):
        # Take joint action
        new_positions = self.current_positions.detach()
        ego_actions = self.joint2ego_action(joint_action)
        for k, ego_action in enumerate(ego_actions):
            new_positions[k] = self.move(ego_action, self.current_positions[k])
        return new_positions

    def get_aux_reward(self,positions):
        """Reward if prey gets itself caught"""
        rewards = np.zeros([self.n_agents, 1],dtype=float)
        if self.done: return rewards
        pgain = 1
        r_catch = self.r_catch * self.scale_rcatch
        for k in range(self.n_agents):
            rgain = (r_catch - self.step_count) if self.check_caught(positions) else 0
            if self.iCPT_agent == k: rg_hat, pg_hat = self.CPT.transform(rgain,pgain)
            else: rg_hat, pg_hat = rgain, pgain
            expected_reward = rg_hat  # expected reward
            rewards[k] = expected_reward
        return rewards

    def get_action_reward(self,positions):
        """Reward from agent taking actions"""
        rewards = np.zeros([self.n_agents, 1],dtype=float)
        if self.done: return rewards

        # Get stage reward
        r_catch = self.r_catch * self.scale_rcatch
        r_pen = self.r_penalty * self.scale_penalty  if self.enable_penalty else 0
        p_pen = self.p_penalty

        for k in range(self.n_agents):
            rgain = ((r_catch - self.step_count) if self.check_caught(positions) else 0)
            rloss = rgain + (r_pen if self.check_is_penalty(positions[k]) else 0)
            if self.iCPT_agent == k:
                rg_hat, pg_hat = self.CPT.transform(rgain, 1 - p_pen)
                rl_hat, pl_hat = self.CPT.transform(rloss, p_pen)
            else:
                rg_hat, pg_hat = rgain, 1 - p_pen
                rl_hat, pl_hat = rloss, p_pen
            expected_reward = (rg_hat * pg_hat) + (rl_hat * pl_hat)
            rewards[k] = expected_reward
        return rewards

    #####################################
    # CHECK STATE FUNCTIONS #############
    #####################################
    def check_done(self,positions=None):
        positions = self.current_positions if positions is None else positions
        if self.check_caught(positions) or (self.step_count >= self.n_moves): return True
        return False
    def check_caught(self,positions):
        d0 = dist(positions[0], positions[-1])
        d1 = dist(positions[1], positions[-1])
        return np.all(np.array([d0, d1]) <= 1)
    def check_is_penalty(self,pos):
        assert np.size(pos)==2,'incorrect size of position in penalty check'
        return np.any(np.all(pos == self._penalty_states, axis=1))
    def check_is_wall(self,pos):
        assert np.size(pos) == 2, 'incorrect size of position in penalty check'
        return np.any(np.all(pos == self._walls, axis=1))
    def check_in_bounds(self,pos):
        assert np.size(pos) == 2, 'incorrect size of position in penalty check'
        return np.all(pos >= self._min_pos) and np.all(pos <= self._max_pos)
    def check_valid_state(self,pos):
        return self.check_in_bounds(pos) and not self.check_is_wall(pos)

    #####################################
    # ACTION FUNCTIONS ##################
    #####################################
    def move(self, ego_action: int, curr_pos, force_valid_move=True):
        assert ego_action in range(self.n_ego_actions),'Unknown ego action in env.move()'
        action_name = self.idx2action[int(ego_action)]
        next_pos = curr_pos + self.explicit_actions[action_name]
        if force_valid_move:
            is_valid = self.check_valid_state(next_pos)
            if not is_valid:  next_pos = curr_pos
        return next_pos

    def joint2ego_action(self,joint_action):
        aR = math.floor(joint_action / self.n_ego_actions)
        aH =  int(joint_action % self.n_ego_actions)
        assert aR <= self.n_ego_actions-1, f'robot action {aR} out of range'
        assert aH <= self.n_ego_actions-1, f'human action {aH} out of range'
        return [aR, aH]

    #####################################
    # INITIALIZATION FUNCTIONS ##########
    #####################################

    def reset(self):
        if self.enable_rand_init: self.current_positions = self.rand_init()
        else: self.current_positions = self._start_obs.copy()
        self.done = False
        self.step_count = 0
        self.cum_rewards = np.zeros([self.n_agents, 1])
        return self.observation

    def rand_init(self):
        for attempt in count():
            _obs = np.random.randint(low=1,high=5,size=self._start_obs.shape)
            is_valid = all([self.check_valid_state(s) for s in _obs])
            not_trivial = np.any(self.agent2prey_dist(_obs)>=2)
            if is_valid and not_trivial: break
            if attempt > 1e6:  raise Exception('env: rand init failed')
        return _obs


    @ property
    def observation(self):
        return self.current_positions.copy().flatten()


def main():
    env = PursuitEvastionGame(1)
    state = env.reset()
    aJ = 5 #torch.tensor(1,**env.tensor_type)
    for epi in range(10):
        print(f'state: {env.current_positions.flatten()}')
        next_state,reward,done,_ = env.step(aJ)


if __name__ == "__main__":
    main()
