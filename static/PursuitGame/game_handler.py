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
from datetime import datetime
fname_Qfun = os.getcwd() + '/static/PursuitGame/Qfunctions.npz'
Qfunctions = np.load(fname_Qfun)
class GameHandler(object):
    @classmethod
    def sample_treatment(cls):
        def count_files_with_substring(directory_path, substring):
            count = 0
            for fname in os.listdir(directory_path):
                count += 1 if substring in fname else 0
            return count

        TREATMENTS = ['AA','AS','SA','SS']
        TREATMENTS_FULL = [{'R':'Averse','H':'Averse'},
                           {'R':'Averse','H':'Seeking'},
                           {'R':'Seeking','H':'Averse'},
                           {'R':'Seeking','H':'Seeking'}]
        savedata_dir = 'savedata/'
        treatment_counts = [0,0,0,0]
        for i, f_substring in enumerate(TREATMENTS):
            treatment_counts[i] = count_files_with_substring(savedata_dir,f_substring)

        itreatment = np.argmin(treatment_counts)
        treatment = TREATMENTS_FULL[itreatment]
        print(f'Treatment Counts {TREATMENTS}: {treatment_counts}')

        # treatment = {}
        # treatment['R'] = 'Averse'
        # treatment['H'] = 'Averse'
        print(f'Sampling treatment... {treatment}')

        return treatment

    @classmethod
    def new(cls):
        print('\n\n Initializing new game...\n')
        INIT_WORLD = 0
        treatment = GameHandler.sample_treatment()
        savedata = DataHandler(treatment)
        return GameHandler(iworld=INIT_WORLD,treatment=treatment,savedata=savedata)

    def __init__(self,iworld,treatment,savedata,debug = False):
        print(f'INITIALIZING GAME:')
        print(f'[Treatment]: {treatment}')

        R_assumption = treatment['R']
        H_condition = treatment['H']
        self.debug = debug
        self.iworld = iworld
        self.treatment = treatment
        self.savedata = savedata
        self.done = False  # game is done and disable move
        self.is_finished = False  # ready to advance to next slide
        self.Qname = f'W{iworld}{R_assumption}'

        # Settings
        self.disable_practice_prey = True

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

        self.got_penalty = False
        self.penalty_counter = 0
        self.remaining_moves = 20 if not self.debug else 3
        self.t_evader_move_delay = 0.5


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


    def check_done(self):
        dist_R2E = dist(self.state[0:2],self.state[4:6])
        dist_H2E = dist(self.state[2:4],self.state[4:6])
        is_caught = (dist_R2E <=1 and dist_H2E <=1)
        no_remaining_moves = (self.remaining_moves <= 0)
        done = (is_caught or no_remaining_moves)
        return done

    def new_world(self,iworld=None):
        print(f'\nSTARTING NEW WORLD {self.iworld}')
        next_iworld = self.iworld+1 if iworld is None else iworld
        self.__init__(next_iworld,treatment=self.treatment,savedata=self.savedata)
        self.iworld = next_iworld
        self.savedata.store_state(self.iworld,self.state)

    def roll_penalty(self,curr_pos):
        in_pen = any([np.all(np.array(curr_pos) == np.array(s)) for s in self.penalty_states])
        if in_pen: got_pen = np.random.choice([True,False],p=[self.pen_prob,(1-self.pen_prob)])
        else:  got_pen = False
        self.got_penalty = got_pen
        return got_pen

    def check_move_wall(self,curr_pos,move):
        new_pos = curr_pos + move
        if any([np.all(new_pos==w) for w in self._walls]):  return curr_pos
        else:  return new_pos


    def update_state(self,move_R,move_H,move_E):
        new_state = np.array(self.state).copy()
        for _slice, _move in zip([slice(0, 2), slice(2, 4), slice(4, 6)], [move_R, move_H, move_E]):
            new_state[_slice] = self.check_move_wall(new_state[_slice], _move)
        print(f'MOVE [{self.state[2:4]}->{new_state[2:4]}]')
        return [int(s) for s in new_state]

    def execute_players(self,move_H):
        move_R = [-move_H[0], move_H[1]] if self.iworld == 0 else self.decide_robot_move()  # mirror H if in practice
        move_E = self.a2move['wait']
        self.state = self.update_state(move_R,move_H,move_E)
        return self.get_gamestate()

    def execute_evader(self):
        move_R = self.a2move['wait']
        move_H = self.a2move['wait']
        move_E = self.a2move['wait'] if self.iworld == 0 else self.decide_prey_move() # dont move in practice
        self.state = self.update_state(move_R, move_H, move_E)
        return self.get_gamestate()

    def get_gamestate(self):
        data = {}
        data['iworld'] = self.iworld
        data['penalty_states'] = self.penalty_states
        data['state'] = self.state
        data['done'] = bool(self.done)
        # data['is_finished'] = self.is_finished
        data['moves'] = self.remaining_moves
        data['nPen'] = self.penalty_counter
        data['got_pen'] = bool(self.got_penalty)
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
            pref_closer = min(0.5,(dists.max()-dists.min())/dmax) #             pref_closer = 0.3
            # print(f'({dists.max().round(4)}-{dists.min().round(4)}/{np.round(dmax,4)} pref={2*pref_closer}')
            w_dists =(0.5+pref_closer)*dists.min() + (0.5-pref_closer)*dists.max() # weighted dists
            q_res = q_scale*np.power(w_dists,q_pow)
            return q_res

        # Decide Prey action
        qA = np.zeros(n_ego_actions)
        for ia in range(n_ego_actions):
            # move_E = self.a2move[ia] if self.move_enables['E'] else self.a2move['wait']
            move_E = self.a2move[ia]
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
        ichoice = np.random.choice(np.arange(n_ego_actions),p=pA)
        move_E = self.a2move['wait'] if self.done else self.a2move[ichoice]

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






class DataHandler(object):
    @classmethod
    def load(cls,path):
        savedata = DataHandler(None)
        loaddata_dict = np.load(path,allow_pickle=True)
        for key in loaddata_dict.keys():
            savedata.__dict__[key] = copy.deepcopy(loaddata_dict[key])
        savedata.background = savedata.background.item()
        savedata.condition = savedata.condition.item()
        savedata.fname = savedata.fname.item()
        savedata.save_dir = savedata.save_dir.item()
        savedata.tstamp = savedata.tstamp.item()

        return savedata

    def __init__(self, condition):
        if condition is not None:
            self.save_dir = 'savedata/'

            self.condition = condition
            self.tstamp = datetime.now()  # current date and time
            self.fname = self.format_file_name()

            self.background = None
            self.survey = [None for _ in range(8)]
            self.states = [None for _ in range(8)]
            self.got_penalties = [None for _ in range(8)]

            print(f'Initialized DataHandler [{self.fname}]')
            # self.save()

    def format_file_name(self):
        str_extension = '.npz'
        str_date = self.tstamp.strftime("%m%d")
        str_time = self.tstamp.strftime("%H%M%S")
        cond_R = self.condition['R'][0] # first letter of R condition
        cond_H = self.condition['H'][0] # first letter of H condition
        str_cond = f'{cond_R}{cond_H}'
        fname = f'{str_date}_{str_time}_{str_cond}' + str_extension
        return fname

    def store_background(self,bg_responses):
        self.background = copy.deepcopy(bg_responses)
    def store_survey(self, iworld, survey_responses):
        self.survey[iworld] = copy.deepcopy(survey_responses)

    def store_state(self,iworld,state,got_penalty):
        if self.states[iworld] is None: self.states[iworld] = np.array(state).reshape([1,len(state)])
        else:  self.states[iworld] = np.vstack([self.states[iworld], np.array(state)])

        if self.got_penalties[iworld] is None:
            self.got_penalties[iworld] = np.array(got_penalty).reshape([1, 1])
        else:
            self.got_penalties[iworld] = np.vstack([self.got_penalties[iworld], np.array(got_penalty)])

    def save(self):
        print(f'Saving Data... [{self.fname}]')
        np.savez_compressed(self.save_dir + self.fname, **self.__dict__)



