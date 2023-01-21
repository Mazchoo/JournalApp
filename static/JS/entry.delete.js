

let enableDeleteButton = function() {
    $('#btn-delete').removeClass('disabled');
    $('#btn-delete').removeClass('btn-outline-danger');
    $('#btn-delete').addClass('btn-danger');
}


let disableDeleteButton = function() {
     $('#btn-delete').removeClass('btn-danger');
     $('#btn-delete').addClass('disabled');
     $('#btn-delete').addClass('btn-outline-danger');
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
               if ("error" in response) showMessageSimpleModal('Delete Error', response);
               if ("success" in response) window.location.reload();
          },
          error: function(_jqXhr, _textStatus, errorThrown){
               showMessageSimpleModal('Unknown Error', errorThrown);
          },
          complete: function(_jqXhr, _textStatus) {
               $('#spinner-save').addClass('invisible');
               disableDeleteButton();
          }
    })
}


let deleteContent = function() {
    if ($('#btn-delete').hasClass('disabled')) return;

    showCallbackModal("Are you sure?", "Delete this entry from database?", "Delete", deleteFromDatabase);
}
