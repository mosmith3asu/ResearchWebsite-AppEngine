




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
let user_input = new UserInput()

let G = new Game([1,0,3,3,1,0]);
G.render()



// ###############################################
// ########### WEBSOCKET #########################
// ###############################################



$(document).ready(function() {
    const socket = io();
    function request_gamestate_update(){
        const user_input_buffer =  user_input.read_buffer()
        socket.emit('update_gamestate', user_input_buffer)
    }

    // Emit actions on .js event ######################################################
    setInterval(function (){
        // Handle general update request
        if (G.request_gamestate_update_pending){
            // if (G.clock.dt >= 0.1){request_gamestate_update(); }
            request_gamestate_update();
            G.request_gamestate_update_pending = false;
        }
        G.render()

    }, update_rate) // 1 millisecond is almost close to continue



    // Update game data on response from server ##########################################
    socket.on( 'update_gamestate', (data)=>{
        // Handle Navigation Buttons
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
            if (current_view==='canvas-frame'){  G.is_closed = false; }
        }
        // Handle Game Rendering
        if (data['view'] === 'canvas-frame'){
            console.log('Updating [' + G.clock.dt + ']')
            G.update(data)
            if (G.clock.dt > G.clock.tdur){ G.clock.reset()}
            G.render()
            document.getElementById("backButton").style.display = 'none';
        }
    })

    // Connect Navigation Buttons
    document.getElementById("backButton").addEventListener("click",
        function() { user_input.store('button','back');  request_gamestate_update(); });
    document.getElementById("nextButton").addEventListener("click",
        function() {
            // user_input.store('button','continue');
            // submit_background
            if (nextButton.textContent=='Submit Survey'){  gather_survey_responses() }
            else if (nextButton.textContent=='Submit Background') {  gather_background_responses()}
            // else if (nextButton.textContent=='Begin Game') { user_input.store('button','continue'); request_gamestate_update()}
            else{  user_input.store('button','continue'); request_gamestate_update();
            }
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
            user_input.store('submit_background',responses)
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
            document.getElementById('survey-incomplete').style.display = 'none' // hide incomplete msg
            user_input.store('submit_survey',responses) // add survey to user input
            request_gamestate_update();
        }


    }

    // Read Key Inputs
    $(document).keydown(function(e) {
        let current_action = decode_keypress(e)
        if (current_action==='spacebar'){current_action='wait';};
        console.log(`PRESS: ${current_action}`);
        user_input.store('keypress',current_action);
        G.current_action = current_action;
        G.render();

        // Debug advance/back keys [<,>] #######################################################
        if (e.keyCode === 190) { user_input.store('button','continue');request_gamestate_update();};
        if (e.keyCode === 188) { user_input.store('button','back');request_gamestate_update();};

    })



})


// $(document).ready(function() {
//     const socket = io();
//     function request_gamestate_update(){
//         const user_input_buffer =  user_input.read_buffer()
//         socket.emit('update_gamestate', user_input_buffer)
//     }
//
//     // Emit actions on .js event ######################################################
//     // var updated_after_finish = false
//     var updated_prey_move = false
//     setInterval(function (){
//         // let updated_after_finish = false
//         // let updated_prey_move = false
//
//         // Handle general update request
//         if (G.request_gamestate_update_pending){
//             if (G.clock.dt >= 0.1){request_gamestate_update(); }
//             // request_gamestate_update();
//             G.request_gamestate_update_pending = false;
//         }
//         G.render()
//
//         // Handle game ticking
//         // if (! G.is_finished){
//         //     updated_after_finish = false
//         //     G.clock.tic()
//         //     // if (G.clock.dt >=  G.clock.tdur + 0.5) {  // evader move
//         //     if (G.clock.dt >=  0.55 && ! updated_prey_move) {  // evader move
//         //         updated_prey_move = true
//         //         request_gamestate_update()
//         //     }
//         //     if (G.clock.dt >= G.clock.tdur){  // execute player
//         //         request_gamestate_update()
//         //         updated_prey_move = false;
//         //     }
//         //     G.timer = G.clock.percent_complete()
//         // }
//         // else if (! updated_after_finish){ //update once to advance to next instruction
//         //     updated_after_finish = true
//         //     request_gamestate_update()
//         // }
//         // G.render()
//     }, update_rate) // 1 millisecond is almost close to continue
//
//
//
//     // Update game data on response from server ##########################################
//     socket.on( 'update_gamestate', (data)=>{
//         // Handle Navigation Buttons
//         let button_content = data['buttons']
//         if (button_content['next']===null){ nextButton.style.display = 'none';}
//         else{ nextButton.style.display = 'block';  nextButton.innerHTML =  button_content['next']; }
//         if (button_content['back']===null){ backButton.style.display = 'none';}
//         else{ backButton.style.display = 'block';  backButton.textContent  = button_content['back']; }
//
//         // Handle New Page View
//         if (data['view'] !== current_view){
//             show(data['view'])
//             current_view = data['view']
//             console.log('Changing view to '+ current_view)
//             if (current_view==='canvas-frame'){  G.is_closed = false; }
//         }
//         // Handle Game Rendering
//         if (data['view'] === 'canvas-frame'){
//             console.log('Updating [' + G.clock.dt + ']')
//             // console.trace()
//             G.update(data)
//             if (G.clock.dt > G.clock.tdur){ G.clock.reset()}
//             G.render()
//             document.getElementById("backButton").style.display = 'none';
//         }
//     })
//
//     // Connect Navigation Buttons
//     document.getElementById("backButton").addEventListener("click",
//         function() { user_input.store('button','back');  request_gamestate_update(); });
//     document.getElementById("nextButton").addEventListener("click",
//         function() {
//             // user_input.store('button','continue');
//             // submit_background
//             if (nextButton.textContent=='Submit Survey'){  gather_survey_responses() }
//             else if (nextButton.textContent=='Submit Background') {  gather_background_responses()}
//             // else if (nextButton.textContent=='Begin Game') { user_input.store('button','continue'); request_gamestate_update()}
//             else{  user_input.store('button','continue'); request_gamestate_update();
//             }
//         }
//     );
//     function gather_background_responses(){
//         let responses = {}
//         let has_empty_response = false;
//
//         responses['age'] = document.getElementById('age').value
//         responses['occupation'] = document.getElementById('occupation').value
//
//         let qname = 'sex'
//         let query = 'input[name="' + qname + '"]:checked'
//         let radio = document.querySelector(query);
//         if (radio === null) {  responses[qname] = null; has_empty_response = true;
//         } else { responses[qname] = radio.value }
//
//         qname = 'game_familiarity'
//         query = 'input[name="' + qname + '"]:checked'
//         radio = document.querySelector(query);
//         if (radio === null) {  responses[qname] = null; has_empty_response = true;
//         } else { responses[qname] = radio.value }
//
//         if (has_empty_response){
//             console.warn('BACKGROUND HAS EMPTY RESPONSE')
//             document.getElementById('background-incomplete').style.display = 'inline-block'
//         }
//         else {
//             document.getElementById('background-incomplete').style.display = 'none'
//             user_input.store('submit_background',responses)
//         }
//
//
//     }
//     function gather_survey_responses(){
//         let responses = {}
//         let n_questions = 7
//         let has_empty_response = false;
//         for (var iq = 1; iq <= n_questions; iq++) {
//             const qname = "q" + iq
//             const query = 'input[name="' + qname + '"]:checked'
//             const radio = document.querySelector(query);
//             console.log(radio)
//
//             if (radio === null) {
//                 responses[qname] = null;
//                 has_empty_response = true;
//             } else { responses[qname] = radio.value}
//
//             // document.getElementsByName('q2')[2].checked
//         }
//
//         if (has_empty_response){
//             console.warn('SURVEY HAS EMPTY RESPONSE')
//             document.getElementById('survey-incomplete').style.display = 'inline-block'
//         }
//         else{
//             for (var iq = 1; iq <= n_questions; iq++) {
//                 const qname = "q" + iq
//                 const query = 'input[name="' + qname + '"]:checked'
//                 const radio = document.querySelector(query);
//                 radio.checked = false // reset radio button
//             }
//             document.getElementById('survey-incomplete').style.display = 'none' // hide incomplete msg
//             user_input.store('submit_survey',responses) // add survey to user input
//             request_gamestate_update();
//         }
//
//
//     }
//
//     // Read Key Inputs
//     $(document).keydown(function(e) {
//         let current_action = decode_keypress(e)
//         if (current_action==='spacebar'){current_action='wait';};
//         console.log(`PRESS: ${current_action}`);
//         user_input.store('keypress',current_action);
//         G.current_action = current_action;
//         G.render();
//
//         // Debug advance/back keys [<,>] #######################################################
//         if (e.keyCode === 190) { user_input.store('button','continue');request_gamestate_update();};
//         if (e.keyCode === 188) { user_input.store('button','back');request_gamestate_update();};
//
//     })
//
//
//
// })
