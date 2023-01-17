

let makeMoveRequest = function() {
    console.log("Move <=")
}


let moveEntry = function(e) {

    showDateCallbackModal(
        'Move Date', 
        'What date do you want to move this entry to?',
        'Confirm', 
        makeMoveRequest
    )
}
