
slide_params = [
    ######## BACKGROUND ###############
    {'view':'consentPage', 'buttons': {'next': 'Agree', 'back':None} },
    {'view': 'backgroundPage', 'buttons': {'next': 'Submit Background', 'back':None} },
    {'view': 'surveyPage', 'buttons': {'next': 'Submit Survey', 'back':None} },
    ######## INSTRUCTIONS ###############
    {'view': 'beginInstructionsPage', 'buttons': {'next': 'Next', 'back':None}}, # {'view': 'info-frame', 'img': None, 'title': 'Instructions', 'content': TEXT['begin instructions'], 'backButton': False},
    {'view':'movementInstructionsPage', 'buttons': {'next': 'Next', 'back':'Back'}},
    {'view':'turnsInstructionsPage', 'buttons': {'next': 'Next', 'back':'Back'}},
    {'view': 'penaltiesInstructionsPage', 'buttons': {'next': 'Next', 'back':'Back'}},
    {'view': 'objectiveInstructionsPage', 'buttons': {'next': 'Next', 'back':'Back'}},
    ######## PRACTICE ###############
    {'view': 'practicePage', 'buttons': {'next': 'Begin Practice', 'back':'Back'}},
    {'view':'canvas-frame','buttons': {'next': None, 'back':None}},
    {'view': 'readyPage', 'buttons': {'next': 'Begin', 'back':None}},
    ######## INTERATE EXPERIMENTS ##########
]
for igame in range(6):
    slide_params.append({'view': 'treatmentPage', 'buttons': {'next': 'Begin Game', 'back':None}})
    slide_params.append({'view': 'canvas-frame','buttons': {'next': None, 'back':None}})
    slide_params.append({'view': 'surveyPage', 'buttons': {'next': 'Submit Survey', 'back':None}})

    ######## END EXPERIMENTS ##########
slide_params.append({'view': 'debriefPage','buttons': {'next': None, 'back':None}})
