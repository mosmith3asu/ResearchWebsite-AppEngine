from dataclasses import dataclass

# from PIL import ImageColor


class WorldGenerator(object):
    def __init__(self,iWorld, start_obs,penalty_states):
        grid_shape = (7, 7)
        self.iworld = iWorld

        self.CELL_SIZE = 50
        self.WALL_COLOR = 'black'
        self.PEN_COLOR = 'red'
        self.AGENT_COLOR = [0,255,0]
        # self.AGENT_COLOR = ImageColor.getcolor('blue', mode='RGB')
        self.PREY_COLOR = 'magenta'
        self.viewer = None
        self.n_agents = 2

        self.walls = []
        self.walls += [[0, c] for c in range(grid_shape[1])]
        self.walls += [[r, 0] for r in range(grid_shape[0])]
        self.walls += [[grid_shape[1] - 1, c] for c in range(grid_shape[1])]
        self.walls += [[r,grid_shape[0] - 1] for r in range(grid_shape[0])]
        self.walls += [[2,2],[2,4],[4,2],[4,4]]
        self.grid_shape = grid_shape
        self._start_obs = start_obs
        self._penalty_states = penalty_states

        assert len(grid_shape) == 2, 'expected a tuple of size 2 for grid_shape, but found {}'.format(grid_shape)
        assert grid_shape[0] > 0 and grid_shape[1] > 0, 'grid shape should be > 0'
        assert len(start_obs) == 3, 'expected a tuple of size 3 for start_obs, but found {}'.format(start_obs)



    @property
    def start_obs(self): return self._start_obs
    @property
    def penalty_states(self): return self._penalty_states


@dataclass
class WorldDefinitions:
    # Initialized world
    iworld = 0
    start_obs = [[2, 1], [4, 1], [3, 5]]
    penalty_states = [[5, 3], [3, 3], [1, 3],[3,2],[3,1]]  # [3, 1],[4, 1],
    W0: object = WorldGenerator(iworld, start_obs, penalty_states)

    iworld = 1
    start_obs = [[5, 3], [1, 3], [5, 1]]
    penalty_states = [[1, 1], [1, 2], [2, 1], [3, 1], [3, 4]]
    W1: object = WorldGenerator(iworld,start_obs,penalty_states)

    # iworld = 1
    # start_obs = [[1, 3], [3, 3], [3, 5]]
    # penalty_states = [[1, 5], [1, 4], [5, 4], [5, 3]]  # [3, 1],[4, 1],
    # W1: object = WorldGenerator(iworld, start_obs, penalty_states)


    # TRAINED -------------------
    iworld = 2
    start_obs = [[1, 2], [3, 1], [3, 3]]
    penalty_states = [[3, 3],[2, 3],[4, 3],[3,2],[3,4]]
    W2: object = WorldGenerator(iworld, start_obs, penalty_states)

    # Top Plot ---------------
    # iworld = 2
    # start_obs = [[1, 4], [4,1], [5, 5]]
    # penalty_states = [[5, 1], [5,2],[1,5],[2,5]]
    # W2: object = WorldGenerator(iworld, start_obs, penalty_states)



    iworld = 3
    start_obs = [[2, 1], [2, 5], [2, 3]]
    penalty_states = [[3, 1], [3, 2], [1, 4], [1, 5]]
    W3: object = WorldGenerator(iworld, start_obs, penalty_states)

    # iworld = 4
    # start_obs = [[1, 2], [5, 3], [4, 1]]
    # penalty_states = [[5,1],[5, 2],  [2, 1],  [3, 1], [4, 1],[1,1]]
    # W4: object = WorldGenerator(iworld, start_obs, penalty_states)
    iworld = 4
    start_obs = [[3, 3], [5, 3], [3, 2]]
    penalty_states = [[5, 1], [5, 2],  [3, 1], [4, 1], ]
    W4: object = WorldGenerator(iworld, start_obs, penalty_states)

    iworld = 5
    start_obs = [[5, 3], [1,3], [5, 4]]
    penalty_states = [[1, 4], [1, 5], [2, 5], [4, 1], [5, 1], [5, 2]]
    W5: object = WorldGenerator(iworld, start_obs, penalty_states)

    iworld = 6
    start_obs =  [[4,3], [5, 1], [5,4]]
    penalty_states = [[5, 2], [5, 3], [5, 4]]
    W6: object = WorldGenerator(iworld, start_obs, penalty_states)

    # iworld = 7
    # start_obs = [[1, 3], [4, 3], [3, 5]]
    # penalty_states = [[4, 3], [5, 3], [2, 3]]
    # W7: object = WorldGenerator(iworld, start_obs, penalty_states)

    iworld = 7
    start_obs = [[1, 5], [4, 3], [3, 5]]
    penalty_states = [[5, 2], [5, 3],[5, 4],[5, 5], [2, 3]]
    W7: object = WorldGenerator(iworld, start_obs, penalty_states)


    world = [W0,W1,W2,W3,W4,W5,W6,W7]

WorldDefs = WorldDefinitions()

if __name__ == '__main__':
    print(WorldDefs.world[1].penalty_states)
#     nRows, nCols = 2,4
#     fig,axs = plt.subplots(nRows,nCols)
#     # axs = np.array(axs).reshape(nRows,nCols)
#     axs = np.array(axs).flatten()
#     for iworld,w in enumerate(WorldDefs.world):
#         w.preview( axs[iworld])
#
#     plt.show()

"""

startPos1 = [[1,5], [5,4], [3,3]]
world1 = np.array([
    [B,B,B,B,B,B,B],
    [B,p,_,_,_,_,B],
    [B,_,B,p,B,_,B],
    [B,_,_,_,_,_,B],
    [B,_,B,p,B,_,B],
    [B,_,_,_,_,p,B],
    [B,B,B,B,B,B,B]])

startPos2 = [[1, 1], [5, 5],[1, 5]]
world2 = np.array([
    [B,B,B,B,B,B,B],
    [B,_,p,_,_,_,B],
    [B,_,B,_,B,_,B],
    [B,_,_,_,_,_,B],
    [B,_,B,_,B,_,B],
    [B,_,p,_,p,_,B],
    [B,B,B,B,B,B,B],])

startPos3 = [[1, 4], [3, 5],[5, 5]]
world3 = np.array([
    [B,B,B,B,B,B,B],
    [B,p,p,_,_,_,B],
    [B,p,B,_,B,_,B],
    [B,_,_,_,_,_,B],
    [B,_,B,_,B,p,B],
    [B,_,_,_,p,p,B],
    [B,B,B,B,B,B,B],])

startPos4 = [[2, 5],[4, 5],[3, 1]]
world4 = np.array([
    [B,B,B,B,B,B,B],
    [B,_,_,_,_,p,B],
    [B,p,B,_,B,_,B],
    [B,_,_,_,p,_,B],
    [B,_,B,_,B,_,B],
    [B,_,_,p,_,_,B],
    [B,B,B,B,B,B,B],])

startPos5 = [[1, 4],[3, 5],[3, 3]]
world5 = np.array([
    [B,B,B,B,B,B,B],
    [B,p,_,_,_,_,B],
    [B,p,B,_,B,_,B],
    [B,_,_,_,_,_,B],
    [B,_,B,p,B,_,B],
    [B,_,_,_,_,p,B],
    [B,B,B,B,B,B,B],])

startPos6 = [[1, 2],[5, 2],[3, 2]]
world6 = np.array([
    [B,B,B,B,B,B,B],
    [B,p,_,_,_,_,B],
    [B,_,B,_,B,_,B],
    [B,_,_,_,_,p,B],
    [B,_,B,_,B,_,B],
    [B,p,p,_,p,p,B],
    [B,B,B,B,B,B,B],])


startPos7 = [[3, 2],[1, 1],[4, 1]]
world7 = np.array([
    [B,B,B,B,B,B,B],
    [B,_,p,p,p,_,B],
    [B,_,B,_,B,_,B],
    [B,_,_,_,_,_,B],
    [B,_,B,_,B,_,B],
    [B,_,_,_,_,_,B],
    [B,B,B,B,B,B,B],])
"""