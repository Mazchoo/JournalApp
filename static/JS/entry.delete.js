

let enableDeleteButton = function() {
    $('#btn-delete').removeClass('disabled');
}


let deleteFromDatabase = function() {
    let csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    $.ajax({
         type: 'POST',
         url: DELETE_URL,
         data: {
               "csrfmiddlewaretoken": csrftoken,
               "name": DATE_SLUG
          },
          success: function(response) {
               showMessageSimpleModal('Save Status', response);
          },
          error: function(_jqXhr, _textStatus, errorThrown){
               showMessageSimpleModal('Unknown Error', errorThrown);
          },
          complete: function(_jqXhr, _textStatus) {
               $('#spinner-save').addClass('invisible');
               $('#btn-delete').addClass('disable');
          }
    })
}


let deleteContent = function() {
    if ($('#btn-delete').hasClass('disabled')) { return; }

    showCallbackModal("Are you sure?", "Delete this entry from database?", "Delete", deleteFromDatabase);
}
