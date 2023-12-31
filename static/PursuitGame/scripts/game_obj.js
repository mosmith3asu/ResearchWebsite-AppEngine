class ColorPallet {
    constructor() {
        this.white =  'rgba(255,255,255,1.0)'
        this.black =  'rgba(0,0,0,1.0)'
        this.red =  'rgba(200,0,0,1.0)';
        this.light_red =  'rgba(200,100,100,1.0)';
    }
}
let COLORS = new ColorPallet()

function getDistance(x1,y1,x2,y2){
    let y = x2 - x1;
    let x = y2 - y1;
    return Math.sqrt(x * x + y * y);

}

//###################################################
//###################################################
//###################################################
class Clock{
    constructor() {
        this.tdur = 3; // duration of move in second
        this.dt = 0;
        this.tstart = new Date();
        this.enable = true;
    }
    reset(){
        this.dt = 0;
        this.tstart = new Date();
    }
    tic(){
        var tnow =  new Date();
        var timeDiff = tnow - this.tstart; //in ms
        timeDiff /= 1000; // strip the ms
        this.dt = timeDiff; // in seconds
    }

    percent_complete(){
        return Math.max( this.dt/this.tdur,0)
    }

}
class Player  {
    constructor(pos,color,size){
        // this.pos = [0,0]
        this.last_pos = pos
        this.last_rot = 90
        this.color = color
        this.can = document.getElementById("canvas");
        this.ctx = this.can.getContext("2d");
        this.nCol = 7; this.nRow = 7;
        this.tile_w = this.can.width/this.nCol;
        this.tile_h = this.can.height/this.nRow;

        this.scale = size
        this.fill = true
        this.unfilled_lw = 8
    }
    draw (pos) {

        var c_ypx = pos[0]*this.tile_h +this.tile_h/2;  // center y loc in pixels
        var c_xpx = pos[1]*this.tile_w +this.tile_w/2; // center x loc in pixels
        var p_ypx = this.scale*this.tile_h;
        var p_xpx =  this.scale*this.tile_w;

        var degree = this.pos2rot(pos)
        var deg2rad = Math.PI / 180


        this.ctx.translate(c_xpx,c_ypx)
        this.ctx.rotate(degree * deg2rad)
        this.ctx.beginPath();
        this.ctx.moveTo(-p_xpx/2 ,-p_ypx/2); // top left
        this.ctx.lineTo(0,         p_ypx/2); // bottom tip
        this.ctx.lineTo(p_xpx/2 , -p_ypx/2 ); // top right
        this.ctx.lineTo(0,        -p_ypx/4);// center indent
        this.ctx.closePath();
        if (this.fill){
            this.ctx.fillStyle = this.color //empty
            this.ctx.fill();
        } else {
            this.ctx.lineWidth = this.scale*this.unfilled_lw
            this.ctx.strokeStyle = this.color
            this.ctx.stroke();
        }
        this.ctx.rotate(-degree * deg2rad)
        this.ctx.translate(-c_xpx,-c_ypx)
        this.last_pos = pos;

    }
    pos2rot(pos){
        var deg;
        var dx = pos[1]-this.last_pos[1] ;
        var dy = pos[0]-this.last_pos[0] ;
        if (dx === 0 && dy ===0){ deg = this.last_rot }
        else if (dy === 1  && dx === 0  ){  deg = 0} // up
        else if (dy === -1 && dx === 0  ){ deg = 180  } // down
        else if (dy === 0  && dx === 1  ){  deg = 270 } // right
        else if (dy === 0  && dx === -1 ){ deg = 90  } // left
        else{ deg = this.last_rot
            console.error((`Unkown Player Move:${deg} - ${pos[0]} ${pos[1]}  => ${this.last_pos[0]} ${this.last_pos[1]}  ${dy} ${dx} `))
        }
        this.last_rot = deg
        return deg

    }

}
class Game  {
    constructor(state) {
        this.world = 0;
        this.state = [1,1,1,1,1,1];
        this.timer = 1;
        this.pen_alpha = 0.0
        this.nPen = 0
        this.moves = 20;
        this.done = true;
        this.is_finished = false;
        this.is_closed = true;
        this.penalty_states = [[1,1]]
        this.current_action = 4

        const canvasFrame = document.getElementById("canvas-frame");
        this.can = document.getElementById("canvas");
        this.ctx = this.can.getContext("2d");
        this.nCol = 7; this.can_w = this.can.width; this.tile_w = this.can.width/this.nCol;
        this.nRow = 7; this.can_h = this.can.height; this.tile_h = this.can.height/this.nRow;

        this.empty_world = [
            [1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1],
            [1,0,1,0,1,0,1],
            [1,0,0,0,0,0,1],
            [1,0,1,0,1,0,1],
            [1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1]];
        this.world_data = [
            [1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1],
            [1,0,1,0,1,0,1],
            [1,0,0,0,0,0,1],
            [1,0,1,0,1,0,1],
            [1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1]];
        this.load_empty_world()

        this.c_robot = 'rgba(100,100,255, 1.0)'
        this.c_human = 'rgba(0,0,255, 1.0)'
        this.c_evader = 'rgba(0,255,0, 1.0)'

        this.robot = new Player([0,0], this.c_robot,0.6)
        this.robot.fill = false
        this.human = new Player([0,0], this.c_human,0.8)
        this.evader = new Player([0,0], this.c_evader,0.8)

        this.clock = new Clock();
        this.request_game_data_pending = false;
        this.request_finished_update_pending = false; // pending game finished overlay
        this.request_players_update_pending = false;
        this.request_evader_update_pending = false;
        // this.request_gamestate_update_pending = false
        this.requested_evader_update = false
        this.got_penalty = false;
        this.treatment = {'R':'Averse','H':'Averse'}

    }
    render(){
        if (! this.is_closed){
            this.clock.tic()
            G.timer = G.clock.percent_complete()

            if (this.done && G.clock.dt >= G.clock.tdur ){ //
                console.log('G>>request finished')
                this.request_finished_update_pending = true;
                this.request_players_update_pending = false;
                // this.request_evader_update_pending = false;
            }
           else if (G.clock.dt >= G.clock.tdur) {  // execute player
                this.request_players_update_pending = true
                this.requested_evader_update = false
            }


            this.clear()
            this.draw_world()
            this.draw_players()
            this.draw_iworld_header()

            this.draw_penalty_counter()
            this.draw_timers()

            this.draw_move_counter()
            this.draw_current_action()
            this.draw_penalty_overlay()
            this.draw_finished_overlay()

            if (this.world===0){
                this.draw_catch_evader_sign()
            }

            // For Instruction Use ###
            // this.highlight_blur()
            // this.highlight_pursuers()
            // this.highlight_moves()
            // this.highlight_penalty()
            // this.highlight_catch()
        }
    }

    new_turn(){
        console.log('G >> new turn <<')
        this.current_action = 'wait'; // wait action
        this.clock.reset()
    }
    open_game(){
        console.log('G >> opening game <<')
        this.is_closed = false;
        this.done = false;
        this.request_finished_update_pending = false;
        this.request_players_update_pending = false;
        this.request_game_data_pending = true;
        this.new_turn();

    }

    close_game(){
        console.log('G >> closing game <<')
        this.is_closed = true;
        this.request_finished_update_pending = false;
        this.request_players_update_pending = false;
        this.ctx.clearRect(0,0,this.can_w,this.can_h);
        this.load_empty_world()
    }
    update(data) {

        this.world = data['iworld']
        this.penalty_states = data['penalty_states']
        this.state = data['state']
        this.done = data['done']
        //data['is_finished'] =
        this.moves = data['moves']
        this.nPen = data['nPen']
        this.got_penalty = data['got_pen']
        this.treatment = data['treatment']

    }
    clear(){
        this.load_empty_world()
        this.ctx.clearRect(0,0,this.can_w,this.can_h);}
    draw_world() {
        let c_black = 'rgba(0,0,0, 1.0)'
        let c_red = 'rgba(255,0,0, 0.3)'
        let c_white ='rgba(255,255,255, 1.0)'
        let scale= 1.01
        let nCol = 7; var nRow = 7;  var col = 0;
        let w = this.tile_w;
        let h = this.tile_h;
        let i = 0;  let j = 0;
        let r; let c;
        let is_num;

        // Intensity matching
        if (this.treatment['H']==='Seeking'){ c_red = 'rgba(255,0,0, 0.1)'; }
        else if  (this.treatment['H']==='Averse'){  c_red = 'rgba(255,0,0, 0.5)';}
        else { c_red = 'rgba(255,0,0, 0.3)';}

        // Update world data with penalties
        var e = 0;
        for (i = 0; i < this.penalty_states.length; i++) {
            r = this.penalty_states[i][0]
            c = this.penalty_states[i][1]
            this.world_data[r][c] = 2
        }


        // DRAW ARRAY ###########################
        for (i = 0; i < nRow; i++) {
            for (j = 0, col = nCol; j <= col; j++) {
                var val = this.world_data[i][j]
                if (val===0) {
                    // console.log((`Drawing ${j}${i} ${val} EMPTY`))
                    this.ctx.fillStyle = c_white //empty
                    this.ctx.fillRect(j * w, i * h, scale * w, scale * h)
                }else if (val===1){
                    // console.log((`Drawing ${j}${i} ${val} PENALTY`))
                    this.ctx.fillStyle = c_black //penalty
                    this.ctx.fillRect(j * w, i * h, scale*w, scale*h)
                }else if (val===2){
                    // console.log((`Drawing ${j}${i} ${val} PENALTY`))
                    this.ctx.fillStyle = c_red //penalty
                    this.ctx.fillRect(j * w, i * h, scale*w, scale*h)
                }
            }
        }
        return (`World ${this.state} ${this.move}`)
    }
    draw_players() {
        var loc = this.state
        this.evader.fill = !(loc[2] === loc[4] && loc[3] === loc[5]);

        this.human.draw([loc[2],loc[3]])
        this.evader.draw([loc[4],loc[5]])
        this.robot.draw([loc[0],loc[1]])
    }
    draw_finished_overlay(){
        if (this.done){
            var c_overlay = 'rgba(0,0,0,0.2)';
            var c_text = 'rgba(255,255,255,1.0)';
            this.ctx.fillStyle = c_overlay;
            // this.ctx.fillRect(0, 0, can.width, can.height);
            this.ctx.fillRect(0, 0, this.can_w, this.can_h);

            this.ctx.font = '48px serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = c_text;
            this.ctx.fillText('Game',    350, 300);
            this.ctx.fillText('Complete',350, 350);
        }
    }
    draw_penalty_overlay(){
        let pen_alpha = 0.0
        if (this.got_penalty && this.moves<20){
            pen_alpha = Math.max(0,1-G.clock.percent_complete()*1.5)

            // Intensity matching
            if (this.treatment['H']==='Seeking'){  pen_alpha = 0.3*pen_alpha}// pen_alpha = }
            if (this.treatment['H']==='Averse'){ pen_alpha = Math.min(1.1*pen_alpha,0.9)}
        }
        if (pen_alpha === 0){this.got_penalty = false;}
        this.ctx.fillStyle = `rgba(255,0,0,${pen_alpha})`;
        this.ctx.fillRect(0, 0, this.can_w, this.can_h);
    }
    draw_penalty_counter(){
        var font_h = 30
        // var yloc = (this.tile_h * (this.nRow-1) )+ this.tile_h/4 + font_h/2//(this.nRow/2 -0.4)

        var yloc = this.tile_h * (7)  - this.tile_h/3
        // var yloc = this.tile_h * (1)  - this.tile_h/3


        // var xloc = this.tile_w * (5.5)
        var xloc = this.tile_w * (5.4)
        // var xoff_cnter =  0.75*this.tile_w
        var xoff_cnter =  0.75*this.tile_w


        var hpad = 0.05*this.tile_h
        var h_patch = 1.0*font_h//0.5*this.tile_h
        var w_patch =0.5*this.tile_w


        var c_label = COLORS.red
        var c_counter = COLORS.black
        var c_patch = COLORS.light_red

        // Clear counter area
        this.ctx.fillStyle = c_patch;
        this.ctx.clearRect((xloc+xoff_cnter)-w_patch/2,yloc-h_patch + hpad,w_patch,h_patch)
        this.ctx.fillRect((xloc+xoff_cnter)-w_patch/2,yloc-h_patch + hpad,w_patch,h_patch)

        // Add counter elements in
        this.ctx.font = (`${font_h}px serif`)// '30px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = c_label;
        this.ctx.fillText('Penalty: ',  xloc-0.1*this.tile_w, yloc);

        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = c_counter;
        this.ctx.fillText(this.nPen, xloc+xoff_cnter, yloc);
    }
    draw_current_action(){
        let arrow_len = 0.3*this.tile_h;
        let DIRECTION = {
            'down':[0,arrow_len], 1:[0,arrow_len],
            'left':[-arrow_len,0], 2:[-arrow_len,0],
            'up':[0,-arrow_len],3:[0,-arrow_len],
            'right':[arrow_len,0],4:[arrow_len,0],
            'wait':[0,0],5:[0,0],
            'other':[0,0],6:[0,0]};
        let dy = DIRECTION[this.current_action][1];
        let dx = DIRECTION[this.current_action][0];

        let headlen = this.tile_h*0.25; // length of head in pixels
        var arrow_color = COLORS.white;
        // let arrow_color = 'rgba(255,255,255, 1.0)';
        let fromy = (this.nRow-0.5)*this.tile_h;
        let fromx = (this.nCol/2)*this.tile_w;

        this.ctx.fillStyle = arrow_color;
        this.ctx.strokeStyle = arrow_color;


        if (dx === 0 && dy ===0){
            var font_h = 30
            this.ctx.font = (`${font_h}px serif`)// '30px serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = arrow_color;
            this.ctx.fillText('[...]', fromx, fromy+font_h/2);
        } else {
            var tox = fromx + dx;
            var toy = fromy + dy;
            fromx = fromx - dx;
            fromy = fromy - dy;

            var angle = Math.atan2(dy, dx);
            this.ctx.beginPath();
            this.ctx.moveTo(fromx, fromy);
            this.ctx.lineTo(tox, toy);
            this.ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
            this.ctx.moveTo(tox, toy);
            this.ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
            this.ctx.strokeStyle = arrow_color
            this.ctx.stroke();
        }

    }
    draw_iworld_header(){

        var font_h = 50
        var yloc = (this.tile_h * 0 )+ 0.4*this.tile_h + font_h/2
        var xloc = 3.5*this.tile_w
        var xoff_cnter =  0.75*this.tile_w

        var hpad = 0.05*this.tile_h
        var h_patch = 1.0*font_h//0.5*this.tile_h
        var w_patch = this.can_w


        var c_label = COLORS.white//'rgba(255,255,255,1.0)'
        var c_patch = COLORS.black//'rgba(0,0,0,1.0)'

        // Clear counter area
        this.ctx.fillStyle = c_patch;
        this.ctx.clearRect((xloc+xoff_cnter)-w_patch/2,yloc-h_patch + hpad,w_patch,h_patch)
        this.ctx.fillRect((xloc+xoff_cnter)-w_patch/2,yloc-h_patch + hpad,w_patch,h_patch)

        // Add counter elements in
        this.ctx.font = (`${font_h}px serif`)// '30px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = c_label;
        let disp_txt = `GAME ${this.world}/7`;
        if(this.world===0){disp_txt = 'Practice'}

        this.ctx.fillText(disp_txt,  xloc, yloc);


        // this.ctx.fillText( `GAME ${this.world}/7`,  xloc, yloc);


    }
    draw_move_counter(){
        var font_h = 30
        // var yloc = (this.tile_h * (this.nRow-1) )+ this.tile_h/4 + font_h/2//(this.nRow/2 -0.4)
        var yloc = this.tile_h * (7)  - this.tile_h/3

        // var yloc = this.tile_h * (1)  - this.tile_h/3
        var xloc = this.tile_w * (0.9)
        var xoff_cnter =  0.75*this.tile_w

        var hpad = 0.05*this.tile_h
        var h_patch = 1.0*font_h//0.5*this.tile_h
        var w_patch =0.5*this.tile_w


        var c_label = 'rgba(255,255,255,1.0)'
        var c_counter = 'rgba(0,0,0,1.0)'
        var c_patch = 'rgba(255,255,255,1.0)'

        // Clear counter area
        this.ctx.fillStyle = c_patch;
        this.ctx.clearRect((xloc+xoff_cnter)-w_patch/2,yloc-h_patch + hpad,w_patch,h_patch)
        this.ctx.fillRect((xloc+xoff_cnter)-w_patch/2,yloc-h_patch + hpad,w_patch,h_patch)

        // Add counter elements in
        this.ctx.font = (`${font_h}px serif`)// '30px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = c_label;
        this.ctx.fillText('Moves: ',  xloc, yloc);

        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = c_counter;
        this.ctx.fillText(this.moves, xloc+xoff_cnter, yloc);

    }
    draw_timers(){
        var timer_val = this.timer
        timer_val = Math.min(1,timer_val)
        timer_val = Math.max(0,timer_val)


        var y_start = 100
        var y_end = 600
        var timer_height = y_end-y_start
        var timer_width = 60
        var x_evader = 50
        var x_player = 650
        var c_fill =  'rgba(0,0,0, 1.0)'
        var c_player_dim = 'rgba(0,0,150, 1.0)'
        var c_evader_dim = 'rgba(0,150,0, 1.0)'

        // Clear timer space
        this.ctx.clearRect(x_evader-timer_width/2, y_start, timer_width, timer_height)
        this.ctx.clearRect(x_player-timer_width/2, y_start, timer_width, timer_height)
        this.ctx.fillStyle = c_fill //empty
        this.ctx.fillRect(x_evader-timer_width/2, y_start, timer_width, timer_height)
        this.ctx.fillRect(x_player-timer_width/2, y_start, timer_width, timer_height)

        if (timer_val<=0){
            var prog = (1+timer_val)*timer_height
            var tHeight =y_start+prog

            // Evader Timer --------------------------
            this.ctx.fillStyle = this.c_evader //empty
            this.ctx.fillRect(x_evader-timer_width/2, tHeight, timer_width, y_end-tHeight)

            // Disabled player timer -----------------
            this.ctx.fillStyle = c_player_dim
            this.ctx.fillRect(x_player-timer_width/2, y_start, timer_width, timer_height)

        }
        else{
            prog = timer_val*timer_height
            tHeight = y_start+prog

            // player timer --------------------------
            this.ctx.fillStyle = this.c_human
            this.ctx.fillRect(x_player-timer_width/2, tHeight, timer_width, y_end-tHeight)

            // Disabled Evader Timer -----------------
            // this.ctx.fillStyle = c_evader_dim //empty
            // this.ctx.fillRect(x_evader-timer_width/2, y_start, timer_width,timer_height)
            this.ctx.fillStyle = this.c_human //empty
            this.ctx.fillRect(x_evader-timer_width/2, tHeight, timer_width, y_end-tHeight)

        }
    }
    load_empty_world(){
        for(let r=0; r<7;r++){
            for(let c=0; c<7;c++){
                this.world_data[r][c] = this.empty_world[r][c]
            }
        }
    }

    draw_catch_evader_sign(){
        let Tw = this.tile_w; let Th = this.tile_h;
        let fontpx = 20;
        // [0,0.25*Tw] [0,1]
        let xoff = Math.abs(this.clock.percent_complete()-0.5)*0.25*Tw - 0.1*Tw

        this.ctx.beginPath();
        this.ctx.moveTo(6*Tw+xoff ,3.5*Th); // arrow tip
        this.ctx.lineTo(6.5*Tw+xoff, 3*Th);
        this.ctx.lineTo(6.5*Tw+xoff ,3.25*Th);
        this.ctx.lineTo(6.9*Tw+xoff, 3.25*Th);
        this.ctx.lineTo(6.9*Tw+xoff, 3.75*Th);
        this.ctx.lineTo(6.5*Tw+xoff, 3.75*Th);
        this.ctx.lineTo(6.5*Tw+xoff, 4*Th);
        this.ctx.lineTo(6*Tw+xoff, 3.5*Th);
        this.ctx.closePath();
        // this.ctx.strokeStyle = "red";
        // this.ctx.stroke();
        this.ctx.fillStyle = "red";
        this.ctx.fill();
        this.ctx.font = (`${fontpx}px serif`)// '30px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'black';
        this.ctx.fillText('Catch',  6.5*Tw+xoff, 3.5*Th+fontpx/3);
    }

//     INSTRUCTION FUNCTIONS #############
    highlight_penalty(){
        let Tw = this.tile_w;
        let Th = this.tile_h;
        let w = 1;
        let h = 1;
        let scale= 1.01;
        let loc = this.state;
        let c_red = 'rgba(255,0,0, 0.3)'
        let c_black = 'rgba(0,0,0, 1.0)'
        let c_white ='rgba(255,255,255, 1.0)'
        let i = 0; let j = 0;

        // Redraw penalty counter
        i = 6.2; j = 4.5;
        h = 0.7; w = 2;
        this.ctx.fillStyle = c_black
        this.ctx.fillRect(j * Tw , i * Th, scale * w * Tw, scale * h * Th)
        this.highlight_tile(i,j,w,h);
        this.draw_penalty_counter()

        // Highlight penalty state
        i = 5; j = 3;
        h = 1; w = 1;
        this.ctx.fillStyle = c_white
        this.ctx.fillRect(j * Tw , i * Th, scale * w * Tw, scale * h * Th)
        this.highlight_tile(i,j,w,h);

        let Hi = loc[2]; let Hj = loc[3];
        if (i===Hi && j===Hj){
            this.human.draw([Hi,Hj])
        }


    }
    highlight_catch(){
        let Tw = this.tile_w;
        let Th = this.tile_h;
        let w = 1;
        let h = 1;
        let scale= 1.01;
        let loc = this.state;
        let c_red = 'rgba(255,0,0, 0.3)'
        let c_black = 'rgba(0,0,0, 1.0)'
        let c_white ='rgba(255,255,255, 1.0)'
        let i = 0; let j = 0;

        this.ctx.beginPath();
        this.ctx.moveTo(4*Tw ,3*Th);
        this.ctx.lineTo(5*Tw, 3*Th);
        this.ctx.lineTo(5*Tw ,2*Th);
        this.ctx.lineTo(6*Tw, 2*Th);
        this.ctx.lineTo(6*Tw, 5*Th);
        this.ctx.lineTo(5*Tw, 5*Th);
        this.ctx.lineTo(5*Tw, 4*Th);
        this.ctx.lineTo(4*Tw, 4*Th);
        this.ctx.lineTo(4*Tw, 3*Th);
        this.ctx.closePath();
        this.ctx.strokeStyle = "yellow";
        this.ctx.stroke();

        // Redraw evader
        i = loc[4]; j = loc[5];
        this.evader.draw([i,j])

        // Redraw human
        let _i = loc[2]; let _j = loc[3];
        if (getDistance(i,j,_i,_j)===1){
            this.human.draw([_i,_j])
        }

         // Redraw human
        _i = loc[0]; _j = loc[1];
        if (getDistance(i,j,_i,_j)===1){
            this.robot.draw([_i,_j])
        }
    }
    highlight_moves(){
        let Tw = this.tile_w;
        let Th = this.tile_h;
        let w = 1;
        let h = 1;
        let scale= 1.01;
        let loc = this.state;
        let c_red = 'rgba(255,0,0, 0.3)'
        let c_black = 'rgba(0,0,0, 1.0)'
        let c_white ='rgba(255,255,255, 1.0)'
        let i = 0; let j = 0;

        // Redraw movement indicator
        i = 6; j=3;
        w = 1; h=1;
        this.ctx.fillStyle = c_black
        this.ctx.fillRect(j * Tw, i * Th, scale * w * Tw, scale * h * Th)
        this.highlight_tile(i,j,w,h);
        this.draw_current_action()

        // Redraw movement counter
        i = 6.2; j =0.1;
        h = 0.7; w = 2;
        this.ctx.fillStyle = c_black
        this.ctx.fillRect(j * Tw , i * Th, scale * w * Tw, scale * h * Th)
        this.highlight_tile(i,j,w,h);
        this.draw_move_counter()

        // Redraw turn countdown
        i = 0.9; j = 0.1;
        h = 5.1; w = 0.8;
        this.ctx.fillStyle = c_black
        this.ctx.fillRect(j * Tw , i * Th, scale * w * Tw, scale * h * Th)
        this.highlight_tile(i,j,w,h);

        i = 1; j = 6.1;
        h = 5; w = 0.8;
        this.ctx.fillStyle = c_black
        this.ctx.fillRect(j * Tw , i * Th, scale * w * Tw, scale * h * Th)
        this.highlight_tile(i,j,w,h);

        this.draw_timers()

    }
    highlight_pursuers(){
        let w = this.tile_w;
        let h = this.tile_h;
        let scale= 1.01;
        let loc = this.state;
        let c_red = 'rgba(255,0,0, 0.3)'
        let c_black = 'rgba(0,0,0, 1.0)'
        let c_white ='rgba(255,255,255, 1.0)'
        let i = 0; let j = 0;

        // Human redraw tile
        i = loc[2]; j = loc[3];
        this.highlight_tile(i,j,1,1);
        this.human.draw([i,j])

        // Robot redraw tile
        i = loc[0]; j = loc[1];
        this.highlight_tile(i,j,1,1);
        this.robot.draw([i,j])

        // Redraw movement indicator
        i = 6; j=3;
        this.ctx.fillStyle = c_black
        this.ctx.fillRect(j * w, i * h, scale * w, scale * h)
        this.highlight_tile(i,j,1,1);
        this.draw_current_action()
    }
    highlight_tile(i,j,w,h){
        let Tw = this.tile_w;
        let Th = this.tile_h;
        // let w = 0;
        // let h = 0;
        let scale= 1.01;
        let c_red = 'rgba(255,0,0, 0.3)';
        let c_black = 'rgba(0,0,0, 1.0)';
        let c_white ='rgba(255,255,255, 1.0)';
        let state_val = this.world_data[Math.round(i)][Math.round(j)];

        // Redraw tile
        if (state_val===0) {
            this.ctx.fillStyle = c_white //empty
            this.ctx.fillRect(j * Tw, i * Th, scale * w * Tw, scale * h * Th)
        }else if (state_val===1){
            this.ctx.fillStyle = c_black //penalty
            this.ctx.fillRect(j * Tw, i * Th, scale * w * Tw, scale * h * Th)
        }else if (state_val===2){
            this.ctx.fillStyle = c_red //penalty
            this.ctx.fillRect(j * Tw, i * Th, scale * w * Tw, scale * h * Th)
        }


        this.ctx.strokeStyle = "yellow";
        this.ctx.strokeRect(j * Tw, i * Th, scale * w * Tw, scale * h * Th);
        // this.ctx.stroke();
    }
    highlight_blur(){
        let blur_alpha = 0.5;
        this.ctx.fillStyle = `rgba(255,255,255,${blur_alpha})`;
        this.ctx.fillRect(0, 0, this.can_w, this.can_h);
    }

} // End of Class Game

