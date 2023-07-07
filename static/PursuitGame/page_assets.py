
test_views = [
    ######## BACKGROUND ###############
    {'view':'consentPage', 'buttons': {'next': 'Agree', 'back':None} },
    {'view': 'backgroundPage', 'buttons': {'next': 'Submit', 'back':None} },
    {'view': 'surveyPage', 'buttons': {'next': 'Submit', 'back':None} },
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
    test_views.append({'view': 'treatmentPage', 'buttons': {'next': 'Begin Game', 'back':None}})
    test_views.append({'view': 'canvas-frame','buttons': {'next': None, 'back':None}})
    test_views.append({'view': 'surveyPage', 'buttons': {'next': 'Submit', 'back':None}})

    ######## END EXPERIMENTS ##########
test_views.append({'view': 'debriefPage','buttons': {'next': None, 'back':None}})
