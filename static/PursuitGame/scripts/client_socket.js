




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
        // console.log(res)
        this.input_log = {}
        // delete thisIsObject["Cow"]
        // this.last_key = this.no_key
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

// Read Key Inputs
// $(document).keydown(function(e) {
//     console.log(`PRESS: ${decode_keypress(e)}`);
//     user_input.store('keypress',decode_keypress(e));
//
//     // 188 = comma
//     // 190 = period
//     // 46 = del
//     if (e.keyCode === 190) { user_input.store('button','continue')};
//     if (e.keyCode === 188) { user_input.store('button','back')};
//
//     request_gamestate_update()
//
//
// })
//


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
    var updated_after_finish = false
    var updated_prey_move = false
    setInterval(function (){
        if (! G.is_finished){
            updated_after_finish = false
            G.clock.tic()
            // console.log(G.clock.dt)


            if (G.clock.dt >=  G.clock.tdur + 0.75) {
                // evader move
                updated_after_finish = true
                request_gamestate_update()
                G.clock.reset()
            }
            if (G.clock.dt > G.clock.tdur){
                // execute plater
                request_gamestate_update()
                // G.clock.reset()  // console.log(`Client Send: ${user_input_buffer}`)
            }

            // if (! updated_prey_move && G.clock.dt >= 0.55) {
            //     updated_after_finish = true
            //     request_gamestate_update()
            // }
            // G.update(data)
            G.timer = G.clock.percent_complete()
            G.render()
        }
        else if (! updated_after_finish){
            updated_after_finish = true
            request_gamestate_update()
        }
        request_gamestate_update()


    }, update_rate) // 1 millisecond is almost close to continue



    // Update game data on response from server ##########################################
    socket.on( 'update_gamestate', (data)=>{
        // console.log(data)

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
        }
        // Handle Game Rendering
        if (data['view'] === 'canvas-frame'){
            G.update(data)
            // G.render()
            document.getElementById("backButton").style.display = 'none';
        }
    })

    // Connect Navigation Buttons
    document.getElementById("backButton").addEventListener("click", function() { user_input.store('button','back'); request_gamestate_update(); });
    document.getElementById("nextButton").addEventListener("click", function() { user_input.store('button','continue'); request_gamestate_update();});

    // Read Key Inputs
    $(document).keydown(function(e) {
        console.log(`PRESS: ${decode_keypress(e)}`);
        user_input.store('keypress',decode_keypress(e));
        // 188 = comma // 190 = period // 46 = del
        if (e.keyCode === 190) { user_input.store('button','continue')};
        if (e.keyCode === 188) { user_input.store('button','back')};
        request_gamestate_update()
    })



})
