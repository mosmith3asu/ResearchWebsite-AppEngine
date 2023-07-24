from static.PursuitGame.game_handler import DataHandler

savedata = DataHandler.load('savedata/0724_160034_AS.npz')


print(f'BACKGROUND')
for key in savedata.background.keys():
    print(f'{key}:\t {savedata.background[key]}')

print(f'\n\nSURVEYS')
for survey in savedata.survey:
    print(survey)

print(f'\n\nSTATES')
for iworld in range(len(savedata.states)):
    print(f'\nWorld {iworld}')
    if savedata.states[iworld] is not None:
        for imove, state in enumerate(savedata.states[iworld]):

            print(f'[MOVE {imove}] \t {state} \t [PEN={savedata.got_penalties[iworld][imove]}]')
