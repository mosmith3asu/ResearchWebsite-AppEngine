import logging
import time

from flask import Flask, render_template,session,request
from flask_session import Session
from flask_socketio import SocketIO
from jinja2 import TemplateNotFound
from static.PursuitGame.game_handler import GameHandler
from static.PursuitGame.page_assets import slide_params


APP_KEY = '92659'
DEBUG = False
###############################################
#          Define flask app                   #
###############################################
app = Flask("app")
app.debug = DEBUG
app.config['SECRET_KEY'] = APP_KEY
app.config["SESSION_PERMANENT"] = False
app.config[ "SESSION_TYPE"] = "filesystem"
app.config["TEMPLATES_AUTO_RELOAD"] = True
Session(app)
socketio = SocketIO(app)


###############################################
#          Define Routes                      #
###############################################
@app.route('/')
def index():
    try: return render_template('pages/index.html', segment='index')  # ,
    except TemplateNotFound: return render_template('pages/page-404.html'), 404
    except: return render_template('pages/page-500.html'), 500

@app.route('/about')
def about():
    try: return render_template(f'pages/about.html', segment='index')  # ,
    except TemplateNotFound: return render_template('pages/page-404.html'), 404
    except: return render_template('pages/page-500.html'), 500

@app.route('/contact')
def contact():
    try: return render_template(f'pages/contact.html')  # ,
    except TemplateNotFound: return render_template('pages/page-404.html'), 404
    except: return render_template('pages/page-500.html'), 500

@app.route('/participate')
def participate():
    try: return render_template(f'pages/participate.html', segment='index')  # ,
    except TemplateNotFound: return render_template('pages/page-404.html'), 404
    except: return render_template('pages/page-500.html'), 500

@app.route('/ineligible')
def ineligible():
    try: return render_template(f'pages/ineligible.html')  # ,
    except TemplateNotFound: return render_template('pages/page-404.html'), 404
    except: return render_template('pages/page-500.html'), 500

@app.route('/render_iRobot')
def render_iRobot():
    try: return render_template(f'pages/render_iRobot.html', segment='index')  # ,
    except TemplateNotFound: return render_template('pages/page-404.html'), 404
    except: return render_template('pages/page-500.html'), 500

@app.route('/render_PursuitGame')
def render_PursuitGame():
    if not session.get('iview'): session['iview'] = 0
    if not session.get('GAME'): session['GAME'] = GameHandler.new()
    return render_template('pages/render_PursuitGame.html',
                           pen_prob = int(session['GAME'].pen_prob*100),
                           pen_reward = session['GAME'].pen_reward)

@app.route('/research_goals')
def research_goals():
    try:  return render_template(f'pages/research_goals.html')  # ,
    except TemplateNotFound:  return render_template('pages/page-404.html'), 404
    except:  return render_template('pages/page-500.html'), 500

@app.route('/researchers')
def researchers():
    try:  return render_template(f'pages/researchers.html')  # ,
    except TemplateNotFound:  return render_template('pages/page-404.html'), 404
    except:  return render_template('pages/page-500.html'), 500

###############################################
#          Define events                   #
###############################################
@socketio.on('connect')
def event_connect():
    session['sid'] = request.sid
    print(f'Client Connected [sid: {request.sid}]...')


@socketio.on('execute_move')
def event_execute_move(action_H):
    # Get metadata
    GAME = session.get("GAME")
    iview = session.get("iview")

    # Perform player move
    move_H = GAME.a2move[action_H]
    GAME.execute_players(move_H)
    GAME.remaining_moves -= 1
    GAME.roll_penalty(GAME.state[slice(2,4)])
    GAME.penalty_counter += 1 if GAME.got_penalty else 0
    GAME.done = GAME.check_done()
    socketio.emit('update_game_data', GAME.get_gamestate(), room=session['sid'])  #

    # Perform Evader Move
    if not GAME.done:
        time.sleep(GAME.t_evader_move_delay)
        GAME.execute_evader()
        GAME.done = GAME.check_done()
        socketio.emit('update_game_data', GAME.get_gamestate(), room=session['sid'])

    GAME.savedata.store_state(GAME.iworld, GAME.state,GAME.got_penalty)
@socketio.on('finish_game')
def event_finish_game(msg):
    # Get metadata
    GAME = session.get("GAME")
    iview = session.get("iview")
    if GAME.done:
        print(f'RESTARTING GAME')
        GAME.new_world()
        GAME.is_finished = False
        GAME.playing = True
        # iview += 1 # <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Add auto instead of sim next button
    else:  logging.warning(f' !! REQUESTED FINISH WITHOUT DONE !!')
    socketio.emit('update_game_data', GAME.get_gamestate(), room=session['sid'])

@socketio.on('navigate')
def event_navigate(message):
    print(f'NAVIGATING....\t {message}')
    send_data = {}
    GAME = session.get("GAME")
    iview = session.get("iview")

    # Back and Continue buttons -----------------
    if 'button' in message.keys():
        if message['button'] == 'continue':
            if 'canvas' in slide_params[iview-1]['view']:
                print('Next game')
                GAME.is_finished = True
                GAME.playing = False
            iview += 1
        elif message['button'] == 'back':
            iview -= 1

    # Form Buttons -------------------------------
    if 'submit_survey' in message.keys():
        iview += 1
        responses = message['submit_survey']
        print(f"SURVEY: {responses}")
        GAME.savedata.store_survey(GAME.iworld,responses)
        GAME.savedata.save()
    if 'submit_background' in message.keys():
        iview += 1
        responses = message['submit_background']
        print(f"BACKGROUND: {responses}")
        GAME.savedata.store_background(responses)

        # Handle Ineligibility condition
        if not is_eligible_to_participate(responses):
            print(f'\n Ineligible participant, redirecting....')
            socketio.emit('ineligible_redirect', 'None', room=session['sid'])
            return None # break event call

    # Package Return Parameters -----------------
    if iview < len(slide_params):
        for key in slide_params[iview].keys():
            send_data[key] = slide_params[iview][key]
    else:
        iview += -1
        print(f'iview overflow.... [{iview}]')
    session['iview'] = iview
    socketio.emit('navigate', send_data, room=session['sid'])

def is_eligible_to_participate(bg_responses):
    print(bg_responses['age'])
    eligible = True
    if int(bg_responses['age']) <= 18 or int(bg_responses['age']) >= 70:
        eligible = False
    return eligible



@socketio.on('request_game_data')
def event_request_game_data(message):
    GAME = session.get("GAME")
    socketio.emit('update_game_data', GAME.get_gamestate(), room=session['sid'])


@socketio.on('update_gamestate')
def event_update_gamestate(message):
    print(f'!!!!!! DEPRICATED GAMESTATE CALL !!!!!!')


###############################################
#              Create App                     #
###############################################
if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', port=8080, debug=True)

