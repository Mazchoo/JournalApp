

let getDestinationSlug = function() {
    let destDay = $("#date-modal-day").children("option:selected").val();
    if (destDay.length == 1) destDay = "0" + destDay;
    let destMonth = String($("#date-modal-month").prop('selectedIndex') + 1);
    if (destMonth.length == 1) destMonth = "0" + destMonth;
    let destYear = $("#date-modal-year").children("option:selected").val();
    
    return `${destYear}-${destMonth}-${destDay}`;
}


let makeMoveRequest = function() {
    let csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    let destinationSlug = getDestinationSlug();

    $('#spinner-save').removeClass('invisible');
    $.ajax({
        type: 'POST',
        url: MOVE_URL,
        data: {
            "csrfmiddlewaretoken": csrftoken,
            "move_from": DATE_SLUG,
            "move_to": destinationSlug
        },
        success: function(response) {
            if ("error" in response) showMessageSimpleModal('Move Status', response["error"]);
            if ("new_date" in response) window.location.replace(response["new_date"]);
        },
        error: function(_jqXhr, _textStatus, errorThrown){
            showMessageSimpleModal('Unknown Error', errorThrown);
        },
        complete: function(_jqXhr, _textStatus) {
            $('#spinner-save').addClass("invisible");
        }
    });
}


let moveEntry = function(e) {
    showDateCallbackModal(
        'Move Date', 
        'What date do you want to move this entry to?',
        'Confirm', 
        makeMoveRequest
    );
}
