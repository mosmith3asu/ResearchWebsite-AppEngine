




// ###############################################
// ########### INTERFACE #########################
// ###############################################

class UserInput {
    constructor() { this.input_log = {}}
    store (key,val){
        // console.log(key,val)
        this.input_log[key] = val;
    }
    read_buffer(){
        // const res = this.last_key
        const res = this.input_log
        this.input_log = {}
        return res
    }
}

function decode_keypress(e) {
    if (e.keyCode === 37) { return pressed = 'left'
    } else if (e.keyCode === 38) {return 'up' //up
    } else if (e.keyCode === 39) {return 'right' //right
    } else if (e.keyCode === 40) {return 'down' //down
    } else if (e.keyCode === 32) {return 'spacebar'
    }  else {   return 'other'}

}

// Disable scroll
document.addEventListener("keydown", function(event) {
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "ArrowDown") { event.preventDefault(); }
});



function hide_all(){
    for (const frame of content_frames) {frame.style.display = 'none';}
}
function show(sel) {
    console.log(`showing:${sel}`)
    hide_all();
    document.getElementById(sel).style.display = 'inline-grid';
}
show(current_view)
// let user_input = new UserInput()

let G = new Game([1,0,3,3,1,0]);
G.render()



// ###############################################
// ########### WEBSOCKET #########################
// ###############################################



$(document).ready(function() {
    const socket = io();
    // Emit actions on .js event ######################################################
    setInterval(function (){
        // Handle general update request
        if (G.request_finished_update_pending){ // pending finished overlay
            G.request_finished_update_pending = false;
            console.log('[' + G.clock.dt + '] Finished Game Overlay...');
            socket.emit('finish_game', 'None');
            socket.emit('navigate',  {'button': 'continue'});
            G.close_game();
        }
        if (G.request_players_update_pending){
            G.request_players_update_pending = false
            console.log('[' + G.clock.dt + '] requesting player update...');
            socket.emit('execute_move', G.current_action);
            G.new_turn()
        }
        if (G.request_game_data_pending){
            G.request_game_data_pending = false;
            console.log('[' + G.clock.dt + '] requesting game data...');
            socket.emit('request_game_data', G.current_action);
        }
        G.render()
    }, update_rate) // 1 millisecond is almost close to continue



    // ######################################################
    // ######################################################

    socket.on( 'update_game_data', (data)=>{
        console.log('[' + G.clock.dt + '] Updating Game Data...');
        G.update(data);
    })



    socket.on( 'ineligible_redirect', (data)=>{
        console.log('[' + G.clock.dt + '] Ineligible redirect...');
        window.location.href = '/ineligible';
        // redirect();
    });


    socket.on( 'navigate', (data)=>{
        console.log('[' + G.clock.dt + '] Navigating...');
        let button_content = data['buttons']
        if (button_content['next']===null){ nextButton.style.display = 'none';}
        else{ nextButton.style.display = 'block';  nextButton.innerHTML =  button_content['next']; }
        if (button_content['back']===null){ backButton.style.display = 'none';}
        else{ backButton.style.display = 'block';  backButton.textContent  = button_content['back']; }

        // Handle New Page View
        if (data['view'] !== current_view){
            show(data['view'])
            current_view = data['view']
            console.log('Changing view to '+ current_view)
            if (current_view==='canvas-frame'){ G.open_game();}
            if (current_view==='surveyPage'){
                if(G.world===0){
                    document.getElementById('pretrial-survey-instructions').style.display = 'inline-grid';
                    document.getElementById('trial-survey-instructions').style.display = 'none';
                }
                else {
                    document.getElementById('pretrial-survey-instructions').style.display = 'none';
                    document.getElementById('trial-survey-instructions').style.display = 'inline-grid';
                }
            }
        }
        // Handle Game Rendering
        if (data['view'] === 'canvas-frame'){ document.getElementById("backButton").style.display = 'none';}

    })




    // ######################################################
    // ######################################################

    // Update game data on response from server ##########################################
    socket.on( 'update_gamestate', (data)=>{
        console.error('!!! DEPRICATED GAMESTATE CALL !!!')
    })

    // Connect Navigation Buttons
    document.getElementById("backButton").addEventListener("click",
        function() { socket.emit('navigate', {'button':'back'});});
    document.getElementById("nextButton").addEventListener("click",
        function() {
            if (nextButton.textContent=='Submit Survey'){  gather_survey_responses() }
            else if (nextButton.textContent=='Submit Background') {  gather_background_responses()}
            else{  socket.emit('navigate', {'button':'continue'}); }
        }
    );
    function gather_background_responses(){
        let responses = {}
        let has_empty_response = false;

        responses['age'] = document.getElementById('age').value
        responses['occupation'] = document.getElementById('occupation').value

        let qname = 'sex'
        let query = 'input[name="' + qname + '"]:checked'
        let radio = document.querySelector(query);
        if (radio === null) {  responses[qname] = null; has_empty_response = true;
        } else { responses[qname] = radio.value }

        qname = 'game_familiarity'
        query = 'input[name="' + qname + '"]:checked'
        radio = document.querySelector(query);
        if (radio === null) {  responses[qname] = null; has_empty_response = true;
        } else { responses[qname] = radio.value }

        if (has_empty_response){
            console.warn('BACKGROUND HAS EMPTY RESPONSE')
            document.getElementById('background-incomplete').style.display = 'inline-block'
        }
        else {
            document.getElementById('background-incomplete').style.display = 'none'
            // user_input.store('submit_background',responses)
            socket.emit('navigate',{'submit_background':responses})
        }


    }
    function gather_survey_responses(){
        let responses = {}
        let n_questions = 7
        let has_empty_response = false;
        for (var iq = 1; iq <= n_questions; iq++) {
            const qname = "q" + iq
            const query = 'input[name="' + qname + '"]:checked'
            const radio = document.querySelector(query);
            console.log(radio)

            if (radio === null) {
                responses[qname] = null;
                has_empty_response = true;
            } else { responses[qname] = radio.value}

            // document.getElementsByName('q2')[2].checked
        }

        if (has_empty_response){
            console.warn('SURVEY HAS EMPTY RESPONSE')
            document.getElementById('survey-incomplete').style.display = 'inline-block'
        }
        else{
            for (var iq = 1; iq <= n_questions; iq++) {
                const qname = "q" + iq
                const query = 'input[name="' + qname + '"]:checked'
                const radio = document.querySelector(query);
                radio.checked = false // reset radio button
            }
            document.getElementById('survey-incomplete').style.display = 'none' // hide incomplete msg;
            socket.emit('navigate',{'submit_survey':responses})
        }


    }

    // Read Key Inputs
    $(document).keydown(function(e) {
        let current_action = decode_keypress(e)
        if (current_action==='spacebar'){current_action='wait';};
        console.log(`PRESS: ${current_action}`);
        // user_input.store('keypress',current_action);
        G.current_action = current_action;
        G.render();

        // Debug advance/back keys [<,>] #######################################################
        if (e.keyCode === 190) {
            if (! this.is_closed){
                console.log('[' + G.clock.dt + '] Finished Game Overlay...');
                socket.emit('finish_game', 'None');
                G.close_game();
            }
            socket.emit('navigate', {'button':'continue'});
        };
        if (e.keyCode === 188) { socket.emit('navigate', {'button':'back'});};
    })
})

