

var HiglightBoarder = false;


function center_align_element(element){
    element.style.display = "block";
    element.style.margin = 'auto';
    element.style.height = '100%';
}

function hide_all(){
    for (let i = 0; i < FRAMES.length; i++) {
        document.getElementById(FRAMES[i]).style.display = 'none';
    }
}



function hide(element_id){
    document.getElementById(element_id).style.display = 'none';
    if (element_id in BUTTONS){
        document.getElementById(BUTTONS[element_id]).style.display = 'none';
    }
}
function show(element_id){
    document.getElementById(element_id).style.display = 'initial';
    if (element_id in BUTTONS){
        document.getElementById(BUTTONS[element_id]).style.display = 'initial';
    }
}


class BackgroundPage_Handler{
    constructor() {

        this.questions = ['What is your age:','What is your occupation:','What is your sex:','How much experience do you have with video games:']
        this.question_types = ['number','text','radio','radio']
        this.question_names = ['age','occupation','sex','game_familiarity']
        this.question_options = [[],[],["Male", "Female", "Other"],['None','Some','A lot']]

        this.create()
        const backgroundFrame = document.getElementById("background-frame");
        backgroundFrame.style.position = 'absolute'
        backgroundFrame.style.height = masterFrame.clientHeight + 'px';
        backgroundFrame.style.width = masterFrame.clientWidth + 'px';
        backgroundFrame.style.color = 'black'

        const backgroundTitle = document.getElementById("background-title");
        backgroundTitle.style.height = "10%";
        backgroundTitle.style.width = "100%";
        backgroundTitle.style.textAlign = 'center'
        backgroundTitle.style.top = 0.25* backgroundFrame.clientHeight  - backgroundTitle.height / 2 + 'px';
        backgroundTitle.style.left =   backgroundFrame.clientWidth / 2 - backgroundTitle.width / 2 + 'px';
        if (HiglightBoarder){backgroundTitle.style.border = '1px solid blue'}


        const backgroundForm =  document.getElementById("background-form");
        backgroundForm.style.width = "100%"
        backgroundForm.style.top = "10%"
        backgroundForm.style.position = 'absolute'
                backgroundForm.style.color = 'black'

        if (HiglightBoarder){ backgroundForm.style.border = '1px solid blue'}



        const backgroundInstructions = document.getElementById("background-instructions");
        backgroundInstructions.style.textAlign = "left";
        backgroundInstructions.style.margin = "auto";
        backgroundInstructions.style.width = "100%";
        backgroundInstructions.style.right = '10%';
        backgroundInstructions.style.tableLayout = "fixed" ;
        if (HiglightBoarder){  backgroundInstructions.style.border = '1px solid blue'}




        // const surveyTable = document.getElementById("survey-table");
        // surveyTable.style.textAlign = "center";
        // surveyTable.style.alignSelf = "center"
        // surveyTable.style.margin = "auto";
        // surveyTable.style.width = "90%";
        // // surveyTable.style.right = '10%';
        // // surveyTable.style.top = "50%" ;
        // surveyTable.style.tableLayout = "fixed" ;
        // surveyTable.style.position = "absolute" ;

        const backgroundTable = document.getElementById("background-table");
        // backgroundTable.style.textAlign = "center";
        // backgroundTable.style.alignSelf = "center"
        // backgroundTable.style.margin = "auto";
        // backgroundTable.style.width = "90%";
        // backgroundTable.style.tableLayout = "fixed" ;
        // backgroundTable.style.position = "absolute" ;
        backgroundTable.style.textAlign = "center";
        // backgroundTable.style.margin = "auto";
        backgroundTable.style.width = "90%";
        backgroundTable.style.right = '5%';
        backgroundTable.style.tableLayout = "fixed" ;
        backgroundTable.style.top = backgroundInstructions.clientHeight + backgroundTitle.clientHeight + 'px';
        // backgroundTable.style.top = "50%";
        backgroundTable.style.position = 'absolute'
        if (HiglightBoarder){  backgroundTable.style.border = '1px solid blue'  }
                        // backgroundTable.style.color = 'black'



        const backgroundIncomplete =  document.getElementById("background-incomplete");
        backgroundIncomplete.style.width = "50%"
        backgroundIncomplete.style.top = "90%"
        backgroundIncomplete.style.position = 'absolute'
        backgroundIncomplete.style.color = 'red'
        backgroundIncomplete.style.textAlign = 'center'
        if (HiglightBoarder){  backgroundForm.style.border = '1px solid blue' }

        hide('background-incomplete')

        const backgroundButton = document.getElementById("submit-background-button");
        backgroundButton.style.position = 'absolute';
        backgroundButton.style.transform = 'translate(-50%,-50%)';
        backgroundButton.style.width = '15%'
        backgroundButton.style.top = '100%';
        backgroundButton.style.left = masterFrame.clientWidth/2- backgroundButton.clientWidth/2 + 'px'


        backgroundButton.addEventListener("click", function() {
            var question_names = ['age','occupation','sex','game_familiarity']
            var question_types = ['number','text','radio','radio']

            var responses = {}
            var has_empty_response = false;
            for (let iq = 0; iq < question_names.length; iq++) {
                var qname = question_names[iq]
                var type = question_types[iq]


                if (type === "radio"){
                    const query = 'input[name="'+qname+'"]:checked'
                    const radio = document.querySelector(query);
                    console.log(radio)
                    if (radio === null){
                        responses[qname] = null
                        has_empty_response = true
                    } else{
                        responses[qname] = radio.value
                        radio.checked = false
                    }
                }
                else {
                    var field = document.getElementById( qname);
                    if (field === null) {
                        console.log(qname + " null val");
                        responses[qname] = null
                        has_empty_response = true
                    } else {
                        if (field.value === "") {
                            console.log(qname + " empty val");
                            has_empty_response = true
                            responses[qname] = null
                        } else {
                            console.log(qname + field.value);
                            responses[qname] = field.value
                        }
                    }
                }
            }
            // console.log(has_empty_response);
            if (has_empty_response){
                show('background-incomplete')
            } else{
                for (let iq = 0; iq < question_names.length; iq++) {
                    const qname = question_names[iq]
                    const type = question_types[iq]
                    if (type ==="radio"){
                        const query = 'input[name="'+qname+'"]:checked'
                        const radio = document.querySelector(query);
                        // radio.checked = false;
                    }else {
                        document.getElementById(qname).value = "";
                    }
                }
                hide('background-incomplete');
                user_input.store('submit_background',responses)
            }
        });
    }
    create(){
        var questions = this.questions
        var question_types = this.question_types
        var question_names = this.question_names
        var question_options = this.question_options
        var table = document.getElementById("background-table");
        var headers = ['','']


        const question_width = 50
        const response_width = 90-question_width
        var row_offset = 0;

        var headerRow = table.insertRow();
        for (let iopt =0; iopt<headers.length; iopt++){
            const headerCell = headerRow.insertCell();
            headerCell.innerHTML = headers[iopt]
            headerCell.style.textAlign = 'center'
            // if (iopt===0){ headerCell.style.width = `${question_width}%`}
            // else{headerCell.style.width = `${response_width}%`}
            if (iopt===0){ headerCell.style.width = "50%"}
            else{headerCell.style.width ="50%"}
        }
        row_offset =  row_offset +1;


        // Create response items
        for (let iq = 0; iq<questions.length; iq++){
            var question1 = table.insertRow();  // create question rows
            var question1Cell = question1.insertCell();  // create question cells
            question1Cell.innerHTML = questions[iq]
            question1Cell.style.textAlign = 'right'
            var fieldCell = table.rows[iq + row_offset].insertCell();

            // if (iq===0){
            //     question1Cell.style.width = '70%'
            //     fieldCell.style.width = '30%'
            // }



            if (question_types[iq] ==='radio'){

                var options = question_options[iq]
                for (let iopt = 0; iopt < options.length; iopt++) {
                    var option = document.createElement("input");
                    option.type = 'radio';
                    option.name = question_names[iq];
                    option.name = question_names[iq];
                    option.value = options[iopt];

                    var optionLabel = document.createElement("label");
                    optionLabel.innerHTML = options[iopt];
                    fieldCell.appendChild(option);
                    fieldCell.appendChild(optionLabel);
                    option.style.width = '5%'
                    optionLabel.style.width = '20%'
                    optionLabel.style.textAlign = 'left'
                    // if (iopt===0){
                    //     fieldCell.appendChild(optionLabel);
                    //     fieldCell.appendChild(option);
                    // } else{
                    //     fieldCell.appendChild(option);
                    //     fieldCell.appendChild(optionLabel);
                    // }

                }

            } else{
                var field = document.createElement("input");
                field.type = question_types[iq];
                field.name = question_names[iq];
                field.id = question_names[iq];
                field.style.width = "80%"

                fieldCell.appendChild(field)
            }




            question1Cell.style.width = "20%"
            fieldCell.style.width ="1%"
            // create radio button cells

        }



        // // Adjust column widths
        // const ths = table.getElementsByTagName("td");
        // ths[0].style.width = "20%"// `${question_width}%`
        // document.getElementsByTagName("td")[0].style.width = question_width;
        // for (let i =1; i<ths.length; i++){
        //     ths[i].style.width = `${response_width}%`
        // }


    }
    update(){

    }
}

class SurveyPage_Handler{
    constructor() {
        this.create()
        const surveyFrame = document.getElementById("survey-frame");
        surveyFrame.style.position = 'absolute'
        surveyFrame.style.height = masterFrame.clientHeight + 'px';
        surveyFrame.style.width = masterFrame.clientWidth + 'px';
        surveyFrame.style.color = 'black';

        const surveyTitle = document.getElementById("survey-title");
        surveyTitle.style.height = "10%";
        surveyTitle.style.width = "100%";
        surveyTitle.style.textAlign = 'center'
        surveyTitle.style.top = 0.25*surveyFrame.clientHeight  - surveyTitle.height / 2 + 'px';
        surveyTitle.style.left =  surveyFrame.clientWidth / 2 - surveyTitle.width / 2 + 'px';
        // surveyTitle.style.border = '1px solid blue'

        const surveyForm =  document.getElementById("survey-form");
        surveyForm.style.width = "100%"
        surveyForm.style.top = "10%"
        surveyForm.style.position = 'absolute'
        // surveyForm.style.border = '1px solid blue'


        const surveyInstructions = document.getElementById("survey-instructions");
        surveyInstructions.style.width = "95%"
        surveyInstructions.style.alignSelf = "center"
        surveyInstructions.style.margin = "auto"


        const surveyTable = document.getElementById("survey-table");
        surveyTable.style.textAlign = "center";
        surveyTable.style.alignSelf = "center"
        surveyTable.style.margin = "auto";
        surveyTable.style.width = "90%";
        surveyTable.style.right = '5%';
        // surveyTable.style.top = "50%" ;
        surveyTable.style.tableLayout = "fixed" ;
        surveyTable.style.position = "absolute" ;
        surveyTable.style.top = 1.5*surveyInstructions.clientHeight + 'px';

        const surveyIncomplete =  document.getElementById("survey-incomplete");
        surveyIncomplete.style.width = "100%"
        surveyIncomplete.style.top = "90%"
        surveyIncomplete.style.position = 'absolute'
        surveyIncomplete.style.color = 'red'
        surveyIncomplete.style.textAlign = 'center'
        // surveyForm.style.border = '1px solid blue'
        hide('survey-incomplete')

        const submitButton = document.getElementById("submit-survey-button");
        submitButton.style.position = 'absolute';
        submitButton.style.transform = 'translate(-50%,-50%)';
        submitButton.style.width = '15%'
        submitButton.style.top = '100%';
        submitButton.style.left = masterFrame.clientWidth/2- submitButton.clientWidth/2 + 'px'

        submitButton.addEventListener("click", function() {
            var n_questions = 7
            var responses = {}
            var has_empty_response = false;
            for (var iq = 1; iq <= n_questions; iq++) {
                const qname = "q"+iq
                const query = 'input[name="'+qname+'"]:checked'
                const radio = document.querySelector(query);
                console.log(radio)
                if (radio === null){
                    responses[qname] = null
                    has_empty_response = true
                } else{
                    responses[qname] = radio.value
                    radio.checked = false
                }
            }
            if (has_empty_response){ show('survey-incomplete')
            } else{ hide('survey-incomplete'); user_input.store('submit_survey',responses) }
        });

        this.master = surveyFrame
        this.table = surveyTable
        this.form = surveyForm
        this.title = surveyTitle
        this.incomplete_msg = surveyIncomplete
        this.submitButton = submitButton
    }
    create(){
        var table = document.getElementById("survey-table");
        const options = ['','0%','10%','20%','30%','40%','50%','60%','70%','80%','90%','100%']
        const questions1 = ['Dependable','Reliable','Unresponsive','Predictable']
        const instructions1 = `What % of the time will this partner be...`
        const questions2 = ['Act Consistantly','Meet the needs of the task','Perform as expected']
        const instructions2 = `What % of the time will this partner...`
        var question_set = [questions1,questions2]
        var instruction_set = [instructions1,instructions2]

        var question_width = 35 //percent width
        var option_width = (95-question_width)/(options.length-1)
        var row_offset = 0;
        var question_offset = 1;
        // `Please complete the following survey based on your feelings when interacting with your virtual partner. When you are finished responding, please press the "Submit" button to continue.`




        // var questions = questions1;
        // var instructions = instructions1;
        for (let iset  = 0; iset < question_set.length; iset++) {
            var questions = question_set[iset];
            var instructions = instruction_set[iset];

            // Create instructions
            var instructionsRow = table.insertRow();
            var emptyCell = instructionsRow.insertCell()
            // emptyCell.style.width = `${question_width}%`


            var instructionsCell = instructionsRow.insertCell()
            instructionsCell.colSpan = options.length-1
            instructionsCell.innerHTML = instructions
            instructionsCell.style.textAlign = 'left'
            instructionsCell.style.fontWeight = 'bold'
            instructionsCell.style.backgroundColor = '#c9d0d6'
            emptyCell.style.backgroundColor = '#c9d0d6'
            emptyCell.style.width = `${question_width}%`
            instructionsCell.style.width = `${100-question_width}%`
            row_offset = row_offset +1;

            // create table header
            var headerRow = table.insertRow();
            for (let iopt =0; iopt<options.length; iopt++){
                const headerCell = headerRow.insertCell();
                headerCell.innerHTML = options[iopt]


                // if (iopt===0){ headerCell.style.width = `${question_width}%`}
                // else{headerCell.style.width = `${option_width}%`}
            }
            row_offset = row_offset +1;

            // Create response items
            for (let iq = 0; iq<questions.length; iq++){
                var question1 = table.insertRow();  // create question rows
                var question1Cell = question1.insertCell();  // create question cells
                question1Cell.innerHTML = questions[iq]
                question1Cell.style.textAlign = 'right'

                // create radio button cells
                for (let iopt =1; iopt<options.length; iopt++) {
                    var radioCell = table.rows[iq + row_offset].insertCell();
                    // radioCell.textAlign = 'center'
                    var radio = document.createElement("input");
                    radio.type = "radio";
                    radio.name = "q" + (iq + question_offset);
                    radio.value = (iopt + 1);
                    radioCell.appendChild(radio);
                    // question_offset = question_offset+1;
                }
            }
            row_offset = row_offset + questions.length;
            question_offset = question_offset + questions.length;

        }

        // Adjust column widths
        // const ths = table.getElementsByTagName("td");
        // ths[0].style.width = "20%"// `${question_width}%`
        // document.getElementsByTagName("td")[0].style.width = `${question_width}%`;
        // for (let i =1; i<ths.length; i++){
        //     ths[i].style.width = `${option_width}%`
        // }

    }
}


class InfoPage_Handler{
    constructor() {
        const infoPage = document.getElementById("info-frame");
        infoPage.style.position = 'absolute'
        infoPage.style.top = "0%"//0.1*masterFrame.clientHeight + 'px';
        infoPage.style.height ="100%" //0.9*masterFrame.clientHeight + 'px';
        infoPage.style.width = "100%"//masterFrame.clientWidth + 'px';
        infoPage.style.border = '1px solid blue'
        infoPage.style.color = 'black'

        const infoPageTitle = document.getElementById("info-page-title");
        infoPageTitle.style.height = "10%";
        infoPageTitle.style.width = "100%";
        infoPageTitle.style.textAlign = 'center'
        infoPageTitle.style.color = 'black'


        const infoImg = document.getElementById("info-img");
        infoImg.style.display = "flex";
        infoImg.style.alignItems = "center";
        infoImg.style.position = "absolute";
        infoImg.style.height =  "25%";
        infoImg.style.width = "100%"
        infoImg.style.border = '1px solid blue'

        const infoPageImg = document.getElementById("info-page-img");
        hide("info-page-img")
        infoPageImg.style.margin = "auto";
        infoPageImg.style.alignSelf = "center";
        infoPageImg.style.height = "100%";
        // infoPageImg.style.border = '1px solid blue'

        const infoPageText = document.getElementById("info-page-text");
        // infoPageText.style.display = 'flex'
        infoPageText.style.position = 'absolute'
        infoPageText.style.height = "50%"// 0.5*infoPage.clientHeight + 'px';
        infoPageText.style.width  = "90%";
          infoPageText.style.left  = "5%";

        infoPageText.style.width  = "90%";
        infoPageText.style.top = infoPageTitle.clientHeight + infoImg.clientHeight  + 10 + 'px';
        infoPageText.style.fontSize = 14+'px'
        infoPageText.style.position = 'absolute'
        // infoPageText.style.border = '1px solid blue'
        // infoPageText.style.setProperty('border'," 1px solid red")
        // infoPageText.style.setAccessible(true);
        // infoPageText.style.set('fontSize',"14px")
        // in`foPageText.style.setProperty('fontSize',"50px")
        // infoPageText.setProperty('style',"fontSize: 50px")
        // infoPageText.setAttribute('style',"fontSize: 50px;")

        //#################################################
        // # BUTTONS #######################################
        const navButtons = document.getElementById("nav-buttons-frame");
        navButtons.style.display = 'flex'
        navButtons.style.justifyContent = 'center'
        navButtons.style.alignItems = 'center'
        navButtons.style.position = 'absolute'
        navButtons.style.height = 30 + 'px';
        navButtons.style.width =  "100%"//masterFrame.clientWidth + 'px';
        navButtons.style.top =  "100%"//masterFrame.clientHeight + 'px';
        navButtons.style.border = '1px solid blue'

        const backButton = document.getElementById("back-button");
        backButton.style.height = navButtons.clientHeight + 'px';
        backButton.style.width = '20%'
        // backButton.style.margin = '0 5%'
        backButton.style.margin = 'auto'
        backButton.style.alignSelf = 'center'
        backButton.style.position = 'absolute'
         backButton.style.left = '20%'

        // backButton.style.right = '20%'
        backButton.addEventListener("click", function() { user_input.store('button','back') });


        const continueButton = document.getElementById("continue-button");
        continueButton.style.height = navButtons.clientHeight + 'px';
        continueButton.style.width = '20%'
        // continueButton.style.margin = '0 5%'
        continueButton.style.margin = 'auto'
        continueButton.style.alignSelf = 'center'
        continueButton.style.position = 'absolute'
        continueButton.style.right = '20%'
        // continueButton.style.left = '20%'
        // continueButton.style.margin = 'auto'
          // continueButton.style.alignSelf = 'center'

        continueButton.addEventListener("click", function() { user_input.store('button','continue')});

        this.master = infoPage;
        this.title = infoPageTitle;
        this.text = infoPageText;
        this.img_container = infoImg;
        this.img = infoPageImg;
        this.backButton = backButton;
        this.continueButton = continueButton;
    }
    update(data){
        if (data['img']=== null){
            hide('info-page-img')
            this.text.style.top = this.title.clientHeight  + 10 + 'px';
        } else{
            show('info-page-img');
            this.img.src = data['img']
            this.text.style.top = this.title.clientHeight + this.img_container.clientHeight  + 10 + 'px';
        }

        if ('backButton' in data){
            if (data['backButton']){this.backButton.style.display = 'initial';}
            else{this.backButton.style.display = 'none';}
        }
        if ('continueButton' in data){
            if (data['continueButton']){this.continueButton.style.display = 'initial';}
            else{this.continueButton.style.display = 'none';}
        }

        if ('fontSize' in data){
            document.getElementById("info-page-text").style.fontSize = data['fontSize']
        }
        if ('textAlign' in data){
            document.getElementById("info-page-text").style.textAlign = data['textAlign']
        }


        this.title.innerHTML = data['title']
        this.text.innerHTML  = data['content']


        // const style_arg =

        // this.text.style.style_arg = "50px"
    }
}