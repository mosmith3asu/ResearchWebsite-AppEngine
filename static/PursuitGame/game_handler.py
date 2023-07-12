# from datetime import datetime
import copy
import logging
import math
import time
import itertools
import warnings
import os
import numpy as np
from .fun_utils import dist
# from apps import Qfunctions
from static.PursuitGame.make_worlds import WorldDefs

fname_Qfun = os.getcwd() + '/static/PursuitGame/Qfunctions.npz'
Qfunctions = np.load(fname_Qfun)
class GameHandler(object):
    @classmethod
    def sample_treatment(cls):
        treatment = {}
        treatment['R'] = 'Baseline'
        treatment['H'] = 'Baseline'
        print(f'Sampling treatment... {treatment}')
        return treatment

    @classmethod
    def new(cls):
        print('\n\n Initializing new game...\n')
        INIT_WORLD = 0
        treatment = GameHandler.sample_treatment()
        return GameHandler(iworld=INIT_WORLD,treatment=treatment)

    def __init__(self,iworld,treatment,debug = False):
        print(f'INITIALIZING GAME:')
        print(f'[Treatment]: {treatment}')

        R_assumption = treatment['R']
        H_condition = treatment['H']
        self.debug = debug
        self.iworld = iworld
        self.treatment = treatment
        self.done = False  # game is done and disable move
        self.is_finished = False  # ready to advance to next pate
        self.Qname = f'W{iworld}{R_assumption}'

        # Settings
        self.disable_practice_prey = True
        self.penalty_enable = True


        if iworld==0:
            self.pen_reward = -3
            self.pen_prob = 1.0
            self.Q = None
        else:
            if H_condition.lower() == 'averse':
                self.pen_reward = -5
                self.pen_prob = 0.9
            elif H_condition.lower() == 'seeking':
                self.pen_reward = -1
                self.pen_prob = 0.1
            elif H_condition.lower() == 'baseline':
                self.pen_reward = -3
                self.pen_prob = 0.5
            else: raise Exception('Unknown treatment in GameHandler')
            self.Q = Qfunctions[self.Qname].copy()
            print(f'[{self.Qname}] Loaded Q-Function: {self.Q.shape}')


        self.state = list(np.array(WorldDefs.world[iworld].start_obs).flatten())
        self.state = [int(s) for s in self.state ]
        self.penalty_states = WorldDefs.world[iworld].penalty_states
        self._walls = WorldDefs.world[iworld].walls

        self.penalty_counter = 0
        self.remaining_moves = 20 if not self.debug else 3
        self.move_enables = {}
        self.move_enables['R'] = True
        self.move_enables['H'] = True
        self.move_enables['E'] = True


        self.t_evader_move_delay = 0.5
        self.t_finished_move_delay = 0.5
        self.t_finished_overlay_delay = 3
        self.t_move_dur = 3.0 if not self.debug else 1.0
        self.t_pen_overlay_dur = (2/3) * self.t_move_dur
        self.t_last_pen = time.time() -10
        self.t_move_start = time.time()


        self.t_start = time.time()
        self.timer = time.time() - self.t_start
        self.timer_max_val = 1
        self.timer_min_val = 0

        self.pen_max_alpha = 0.8
        self.pen_alpha = self.pen_max_alpha

        self.a2name = {}
        self.a2idx = {}
        self.a2move = {}
        self.a2move['down'] = [1,0]
        self.a2move['left'] = [0,-1]
        self.a2move['up'] = [-1,0]
        self.a2move['right'] = [0,1]
        self.a2move['wait'] = [0,0]
        self.a2move['spacebar'] = [0, 0]

        self.a2idx['down'] = 0  # self.a2move[0] = [1,0]
        self.a2idx['left'] = 1  # self.a2move[1] = [0,-1]
        self.a2idx['up'] = 2  # self.a2move[2] = [-1,0]
        self.a2idx['right'] = 3  # self.a2move[3] = [0,1]
        self.a2idx['wait'] = 4  # self.a2move[4] = [0,0]
        self.a2idx['spacebar'] = 4

        for aname in ['down','left','up','right','spacebar','wait']:
            self.a2name[self.a2idx[aname]] = aname
            self.a2name[tuple(self.a2move[aname])] = aname
            self.a2move[self.a2idx[aname]] = self.a2move[aname]
            self.a2idx[tuple(self.a2move[aname])] = aname

        # Buffer that cleares at begining of each move
        self.move_buffer = {}
        self.move_buffer['move_R'] = self.a2move['wait']
        self.move_buffer['move_H'] = self.a2move['wait']
        self.move_buffer['move_E'] = self.a2move['wait']


        self.slicek = {}
        self.slicek['R'] = slice(0,2)
        self.slicek['H'] = slice(2,4)
        self.slicek['E'] = slice(4,6)
        self.prey_dist_power = 5
        self.prey_rationality = 1
        self.robot_rationality = 1
        self.sophistocation  = 4
        self.max_dist = dist([1,1],[5,5])
        self.ijoint, self.solo2joint, self.joint2solo = self.init_conversion_mats()


        self.default_settings = {}
        for key in self.__dict__.keys():
            self.default_settings[key] = copy.deepcopy(self.__dict__[key])

    def tick(self,verbose = False):

        move_duration = time.time()-self.t_move_start
        post_move_duration = -1*min([0,self.t_move_dur - move_duration])

        if not self.done:

            perc_complete = (time.time() - self.t_last_pen)/self.t_pen_overlay_dur
            self.pen_alpha =  self.pen_max_alpha * max([0,1-perc_complete])

            self.timer = move_duration/self.t_move_dur
            self.timer = min([self.timer_max_val, self.timer])
            self.timer = max([self.timer_min_val, self.timer])
            executing = (self.timer == self.timer_max_val)

            if executing:
                if verbose: print(f'EXECUTING:{self.a2name[tuple(self.move_buffer["move_H"])]}')
                players_finished = self.execute_players()
                evader_finished = self.execute_evader(post_move_duration)
                if players_finished and self.penalty_enable:
                    if self.roll_penalty(self.state[2:4]):
                        self.t_last_pen = time.time()
                        self.penalty_counter += self.pen_reward
                    self.penalty_enable = False

                if players_finished and evader_finished:
                    self.new_move(post_move_duration)
                # if players_finished:
                #     for player in ['H','R']:
                #         # self.move_enables[player] = True
                #         self.move_buffer['move_' + player] = self.a2move['wait']
                # if evader_finished:
                #     is_last_move = (self.remaining_moves <= 1)
                #     total_delay = self.t_finished_move_delay
                #     total_delay += self.t_evader_move_delay if not is_last_move else 0
                #     if post_move_duration >= total_delay:
                #         self.penalty_enable = True
                #         self.t_move_start = time.time()
                #         self.remaining_moves = max(0, self.remaining_moves - 1)
                #         self.move_enables['H'] = True
                #         self.move_enables['R'] = True
                #         self.move_enables['E'] = True
                #         self.move_buffer['move_E'] = self.a2move['wait']



            # Check Closing Gamestate
            self.done = self.check_done()
        self.is_finished = self.close_world(post_move_duration)

    def close_world(self,t_post_move):
        finished = False
        if self.done:
            # self.is_finished = True
            if t_post_move >= self.t_finished_overlay_delay:
                finished= True
        return finished

    def check_done(self):
        dist_R2E = dist(self.state[0:2],self.state[4:6])
        dist_H2E = dist(self.state[2:4],self.state[4:6])
        is_caught = (dist_R2E <=1 and dist_H2E <=1)
        no_remaining_moves = (self.remaining_moves <= 0)
        if is_caught or no_remaining_moves:
            done = True
            self.move_enables['R'] = False
            self.move_enables['H'] = False
            self.move_enables['E'] = False
        else:
            done = False
        return done

    def new_world(self,iworld=None):
        print(f'\nSTARTING NEW WORLD {self.iworld}')
        next_iworld = self.iworld+1 if iworld is None else iworld
        self.__init__(next_iworld,treatment=self.treatment)
        self.iworld = next_iworld

    def roll_penalty(self,curr_pos):
        in_pen = any([np.all(np.array(curr_pos) == np.array(s)) for s in self.penalty_states])
        if in_pen: got_pen = np.random.choice([True,False],p=[self.pen_prob,(1-self.pen_prob)])
        else:  got_pen = False
        return got_pen

    def check_move_wall(self,curr_pos,move):
        new_pos = curr_pos + move
        if any([np.all(new_pos==w) for w in self._walls]):  return curr_pos
        else:  return new_pos

    def new_move(self,t_post_move):
        is_last_move = (self.remaining_moves <= 1)
        total_delay = self.t_finished_move_delay
        total_delay += self.t_evader_move_delay if not is_last_move else 0
        if t_post_move >= total_delay:
            self.t_move_start = time.time()
            self.remaining_moves = max(0,self.remaining_moves - 1)
            self.move_enables['R'] = True
            self.move_enables['H'] = True
            self.move_enables['E'] = True
            self.penalty_enable =True
            self.move_buffer['move_E'] = self.a2move['wait']
    def execute_players(self,verbose=False):
        move_R = self.decide_robot_move() if self.move_enables['R'] else self.a2move['wait']  #
        move_H = self.move_buffer['move_H'] if self.move_enables['H'] else self.a2move['wait']
        move_E = self.a2move['wait']

        if self.iworld == 0: # in practice
            # if self.debug:
            if verbose: print(f'-Overwriting move_R...')
            move_R = [-move_H[0],move_H[1]] # mirror H

        new_state = np.array(self.state).copy()
        for _slice,_move in zip([slice(0,2),slice(2,4),slice(4,6)],[move_R,move_H,move_E]):
            new_state[_slice] = self.check_move_wall(new_state[_slice],_move)

        self.state = [int(s) for s in new_state]

        finished = True
        if finished:
            if self.move_enables['H']: # only write no-action once
                self.move_buffer['move_H'] = self.a2move['wait']
            self.move_enables['H'] = False
            self.move_enables['R'] = False

        return finished

    def execute_evader(self,t_post_move):
        is_last_move = (self.remaining_moves <= 1)
        TIME2MOVE = (t_post_move >= self.t_evader_move_delay)
        move_R = self.a2move['wait']
        move_H = self.a2move['wait']
        move_E = self.a2move['wait']

        finished = False
        if TIME2MOVE:
            if self.move_enables['E'] and not is_last_move:
                move_E = self.decide_prey_move()
                # print(f'[{self.remaining_moves}] Evader Move: \t {self.a2name[tuple(move_E)]}')
            finished = True

        # IF PRACTICE ############
        # move_E = self.a2move['wait'] ##################################################################### ERROR #####
        if self.iworld == 0 and self.disable_practice_prey:
            move_E = self.a2move['wait']

        new_state = np.array(self.state).copy()
        for _slice,_move in zip([slice(0,2),slice(2,4),slice(4,6)],[move_R,move_H,move_E]):
            new_state[_slice] = self.check_move_wall(new_state[_slice],_move)
        self.state = [int(s) for s in new_state]

        if finished:  self.move_enables['E'] = False
        return finished

    def sample_user_input(self,key_input,verbose = False):
        # Check initialized
        if  self.move_buffer['move_H'] is None:
            self.move_buffer['move_H'] = self.a2move['wait']

        # Read key input
        if key_input == 'None':
            new_action = self.move_buffer['move_H']
        elif key_input in self.a2idx.keys():
            new_action = self.a2move[key_input]
            if verbose: print(f'KEY INPUT:{key_input}=>{new_action}')
        else:
            new_action = self.move_buffer['move_H']
            logging.warning(f'User input unknown: {key_input}')

        # Store new move
        self.move_buffer['move_H'] = new_action

    def get_gamestate(self):
        data = {}
        data['iworld'] = self.iworld
        data['state'] = self.state
        data['timer'] = self.timer
        data['pen_alpha'] = self.pen_alpha
        data['nPen'] = self.penalty_counter
        data['moves'] = self.remaining_moves
        data['playing'] = not self.done
        data['is_finished'] = self.is_finished
        data['penalty_states'] = self.penalty_states
        data['current_action'] = self.a2idx[tuple(self.move_buffer["move_H"])]
        return data

    ##################################
    # IMPORTED FUNCTIONS #############
    def decide_prey_move(self,verbose=False):
        if self.done: return self.state
        n_ego_actions = 5
        q_inadmissable = -1e3
        move_R = self.a2move['wait']
        move_H = self.a2move['wait']
        slice_R = self.slicek['R']
        slice_H = self.slicek['H']
        slice_E = self.slicek['E']

        def prey_dist2q(dists,dmax):
            q_scale = 2  # power given to weights
            q_pow = 1
            pref_closer =min(0.5,(dists.max()-dists.min())/dmax) #             pref_closer = 0.3
            # print(f'({dists.max().round(4)}-{dists.min().round(4)}/{np.round(dmax,4)} pref={2*pref_closer}')
            w_dists =(0.5+pref_closer)*dists.min() + (0.5-pref_closer)*dists.max() # weighted dists
            q_res = q_scale*np.power(w_dists,q_pow)
            return q_res


            # u_dists = dists / dmax  # normalize unit distances
            # w_diff = (u_dists[0] - u_dists[1])  # weight that devalues farther agent
            # w_diff = np.sign(w_diff)* np.power(np.abs(w_diff),w_pow)
            # wk_closer = np.array([1 - w_diff, 1 + w_diff])  # weights for averaging
            # wk_closer[wk_closer < 0] = 0
            #
            # wk_closer = np.size(dists) * wk_closer / wk_closer.sum()
            # weighted_dists = dists * wk_closer
            # q_res = np.mean(weighted_dists)
            # return np.power(q_res,q_pow)

            # w_pow = 2  # power given to weights
            # # w_lb = 0; w_ub = 2;  # define weighting bounds
            # u_dists = dists / dmax  # normalize unit distances
            # w_diff = (u_dists[0] - u_dists[1])  # weight that devalues farther agent
            # wk_closer = np.array([0.5 - w_diff, 0.5 + w_diff])  # weights for averaging
            # wk_closer[wk_closer < 0] = 0;
            # wk_closer[wk_closer > 1] = 1  # bound weights [0,1]
            # wk_closer = np.power(wk_closer, w_pow)
            # wk_closer = wk_closer / wk_closer.sum()
            # weighted_dists = dists * wk_closer
            # q_res = np.sum(weighted_dists)
            # return q_res

        # Decide Prey action
        qA = np.zeros(n_ego_actions)
        for ia in range(n_ego_actions):
            move_E = self.a2move[ia] if self.move_enables['E'] else self.a2move['wait']
            new_pos = np.array(self.state[slice_E]) + np.array(move_E)
            is_valid = not any([np.all(new_pos == w) for w in self._walls])
            if is_valid:
                move_Joint = np.array([move_R + move_H + move_E],dtype=float)
                new_state = (np.array(self.state,dtype=float) + move_Joint).flatten()
                dist2k = np.array([0., 0.],dtype=float)
                for k, _slice in enumerate([slice_R, slice_H]):
                    dist2k[k] = dist(new_state[_slice], new_state[slice_E])
                    # print(f'{new_state[_slice]} <=> {new_state[slice_E]} = {dist2k[k]}')
                qA[ia] = prey_dist2q(dist2k, self.max_dist)
            else: qA[ia] = q_inadmissable


        pA = self.softmax_stable(self.prey_rationality * qA)
        # print(f'pA[evader]={pA.round(3)}')
        ichoice = np.random.choice(np.arange(n_ego_actions),p=pA)
        move_E = self.a2move[ichoice]

        # REPORT:
        if verbose:
            print(f'[PREY: {self.a2name[ichoice]}={move_E}]\t' +
                  '\t'.join([f'{self.a2name[i]} = {pA[i].round(3)}' for i in range(5)]))

        return move_E

    def decide_robot_move(self, verbose=False):
        if self.iworld==0:
            # if self.debug:
            if verbose: print(f'-Skipping decide_robot_move()...')
            return None # in practice; overwritten in execute_players()
        iR,iH = 0,1
        n_agents = 2
        n_joint_act = 25
        n_ego_act = 5
        sophistocation = self.sophistocation
        rationality = self.robot_rationality
        x0,y0,x1,y1,x2,y2 = list(self.state)

        # Set up quality and probability arrays -------------
        qAjointk = self.Q[:,x0,y0,x1,y1,x2,y2,:]

        pdAjointk = np.ones([n_agents, n_joint_act]) / n_joint_act
        qAegok = np.empty([n_agents,n_ego_act])
        pdAegok = np.ones([n_agents,n_ego_act])/n_ego_act

        # Perform recursive simulation -------------
        for isoph in range(sophistocation):
            new_pdAjointk = np.zeros([n_agents, n_joint_act])
            for k in range(n_agents):
                ijoint = self.ijoint[k, :, :] # k, ak, idxs
                qAjoint_conditioned = qAjointk[k, :] * pdAjointk[int(not k), :] # print(f'{np.shape(qAjoint_conditioned)} x {np.shape(ijoint)}')

                qAegok[k, :] = qAjoint_conditioned @ ijoint.T
                pdAegok[k, :] = self.softmax_stable(rationality * qAegok[k, :])
                new_pdAjointk[k, :] = pdAegok[k,:] @ ijoint / n_ego_act
            pdAjointk = new_pdAjointk.copy()

        # Sample from R's probability -------------
        # ichoice = np.random.choice(np.arange(n_ego_act), p=pdAegok[iR])
        ichoice = np.argmax(pdAegok[iR])
        move_R = self.a2move[ichoice]

        # Check Validity ---------------------------
        if np.all(qAjointk[iR] == 0): warnings.warn(f"!!!!! R's qAjoint= 0 !!!!! ")
        if np.all(qAegok[iR] == 0): warnings.warn(f"!!!!! R's qAego = 0 !!!!! ")
        if np.all(pdAegok[iR] == 0): warnings.warn(f"!!!!! R's pdAego = 0 !!!!! ")

        if np.all(qAjointk[iH] == 0): warnings.warn(f"!!!!! H's qAjoint= 0 !!!!! ")
        if np.all(qAegok[iH] == 0): warnings.warn(f"!!!!! H's qAego = 0 !!!!! ")
        if np.all(pdAegok[iH] == 0): warnings.warn(f"!!!!! H's pdAego = 0 !!!!! ")


        # print(f'State: {list(self.state)}')

        # REPORT:----------------------------------
        if verbose:
            str_label = f'[Robot: {self.a2name[ichoice]}={move_R}]\t'
            str_pdA = '['+'\t'.join([f'{self.a2name[i]} = {pdAegok[iR][i].round(3)}' for i in range(5)]) + ']\t'
            str_QA = '['+'\t'.join([f'{self.a2name[i]} = {qAegok[iR][i].round(3)}' for i in range(5)]) + ']\t'
            # str_Qjoint = f'{qAjointk[iR].round(3)}'

            print( str_label + str_pdA + str_QA)

        return move_R

    def softmax_stable(self,x):
        return(np.exp(x - np.max(x)) / np.exp(x - np.max(x)).sum())

    def init_conversion_mats(self):
        n_agents = 2
        joint2solo = np.array(list(itertools.product(*[np.arange(5), np.arange(5)])), dtype=int)
        solo2joint = np.zeros([5, 5], dtype=int)
        for aJ, joint_action in enumerate(joint2solo):
            aR, aH = joint_action
            solo2joint[aR, aH] = aJ
        ijoint = np.zeros([2, 5, 25], dtype=np.float32)
        for k in range(n_agents):
            for ak in range(5):
                idxs = np.array(np.where(joint2solo[:, k] == ak)).flatten()
                ijoint[k, ak, idxs] = 1
        return ijoint,solo2joint,joint2solo