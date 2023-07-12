from flask import Flask, render_template,session,request
from flask_session import Session
from flask_socketio import SocketIO
from jinja2 import TemplateNotFound
from static.PursuitGame.game_handler import GameHandler
from static.PursuitGame.page_assets import test_views


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

@app.route('/render_iRobot')
def render_iRobot():
    try: return render_template(f'pages/render_iRobot.html', segment='index')  # ,
    except TemplateNotFound: return render_template('pages/page-404.html'), 404
    except: return render_template('pages/page-500.html'), 500

@app.route('/render_PursuitGame')
def render_PursuitGame():
    if not session.get('iview'): session['iview'] = 0
    if not session.get('GAME'):
        # treatment = GameHandler.sample_treatment()
        # treatment = 'Averse'
        # session['GAME'] = GameHandler(iworld=0,treatment=treatment)
        session['GAME'] = GameHandler.new()
    return render_template('pages/render_PursuitGame.html',
                           pen_prob = int(session['GAME'].pen_prob*10),
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

@socketio.on('update_gamestate')
def event_update_gamestate(message):
    send_data = {}
    GAME = session.get("GAME")
    iview = session.get("iview")
    if 'keypress' in message.keys():
        GAME.sample_user_input(message['keypress'])
        # print(message['keypress'])
    if 'button' in message.keys():
        if message['button'] == 'continue':
            # ADDED #################################
            if 'canvas' in test_views[iview-1]['view']:
                print('Next game')
                GAME.is_finished = True
                GAME.playing = False
            #########################################
            iview += 1
        elif message['button'] == 'back':
            iview -= 1
    if 'submit_survey' in message.keys():
        iview += 1
        responses = message['submit_survey']
        print(f"SURVEY: {responses}")
    if 'submit_background' in message.keys():
        iview += 1
        responses = message['submit_background']
        print(f"BACKGROUND: {responses}")
    if 'canvas' in test_views[iview]['view']:
        if GAME.is_finished:
            print(f'RESTARTING GAME')
            GAME.new_world()
            GAME.is_finished = False
            GAME.playing = True
        else: GAME.tick()
        send_data = GAME.get_gamestate()
    for key in test_views[iview].keys():
        send_data[key] = test_views[iview][key]
    session['iview'] = iview
    # print(f'Send {iview}')
    # RESPOND TO THE CLIENT --------------------
    # print(f'Host Rec: {message} Host Send: {send_data}')
    socketio.emit('update_gamestate', send_data, room=session['sid'])  #

###############################################
#              Create App                     #
###############################################
if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', port=8080, debug=True)

