from static.PursuitGame.game_handler import DataHandler

# savedata = DataHandler.load('savedata/0809_163203_AS.npz')
savedata = DataHandler.load('savedata/0809_165448_SS.npz')


print(f'BACKGROUND')
try:
    for key in savedata.background.keys():
        print(f'\t{key}:\t {savedata.background[key]}')
except: print(f'\t - No background')

print(f'\n\nSURVEYS')
for i,survey in enumerate(savedata.survey):
    print(f'\t[{i}] {survey}')

print(f'\n\nSTATES')
for iworld in range(len(savedata.states)):
    print(f'\tWorld {iworld} ------')
    if savedata.states[iworld] is not None:
        for imove, state in enumerate(savedata.states[iworld]):

            print(f'\t\t[MOVE {imove}] \t {state} \t [PEN={savedata.got_penalties[iworld][imove]}]')
