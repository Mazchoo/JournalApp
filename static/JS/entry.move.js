

let getDestinationSlug = function() {
    let destDay = $("#date-modal-day").children("option:selected").val()
    let destMonth = String($("#date-modal-month").prop('selectedIndex') + 1);
    if (destMonth.length == 1) destMonth = "0" + destMonth;
    let destYear = $("#date-modal-year").children("option:selected").val()
    
    return `${destYear}-${destMonth}-${destDay}`
}


let makeMoveRequest = function() {
    let csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    let destinationSlug = getDestinationSlug();

    $.ajax({
        type: 'POST',
        url: MOVE_URL,
        data: {
            "csrfmiddlewaretoken": csrftoken,
            "move-from": DATE_SLUG,
            "move-to": destinationSlug
        },
        success: function(response) {
            showMessageSimpleModal('Move Status', response);
        },
        error: function(_jqXhr, _textStatus, errorThrown){
            showMessageSimpleModal('Unknown Error', errorThrown);
        }
    })
}


let moveEntry = function(e) {
    showDateCallbackModal(
        'Move Date', 
        'What date do you want to move this entry to?',
        'Confirm', 
        makeMoveRequest
    )
}
