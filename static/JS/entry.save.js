
let generateSaveEntry = function(saveContent) {
     if (saveContent === null) {return;}
     let saveData = {};

     for (let i = 0; i < saveContent.length; i++) {
          let content = saveContent[i];
          let contentId = content.id;

          if ($(content).hasClass("entry-text")) {
               let textContent = tinyMCE.get(contentId).getContent();
               let height = getMCEComponentHeight(contentId);
               saveData[contentId] = {
                    "text": textContent,
                    "height": height,
                    "entry": DATE_SLUG
               };
          } else if ($(content).hasClass("img-fluid")) {
               let ind = contentId.replace("image", "");
               let original = $('#original-check' + ind).is(":checked");
               let fileName = $("#upload-label" + ind)[0].textContent;
               saveData[contentId] = {
                    "file_path": fileName,
                    "original":  original,
                    "entry":     DATE_SLUG
               }
          } else {
               console.log("Unrecognised save content");
               return;
          }
     }

    return saveData;
} 


let saveEntryToDatabase = function(saveData) {
    if (saveData === null) {return;}
    let csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    $.ajax({
         type: 'POST',
         url: SAVE_URL,
         data: {
               "content": saveData,
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
               $('#spinner-save').addClass("invisible");
               $('#btn-save').attr("disabled", false);
          }
    })
}


let getSaveData = function() {
    let saveContent = $('.save-content');
    return generateSaveEntry(saveContent);
}


let saveToDatabase = function() {
     $('#btn-save').attr("disabled", true);
     $('#spinner-save').removeClass("invisible");
     let saveData = getSaveData();
     saveEntryToDatabase(saveData);
}

let enableSaveButton = function() {
     $('#btn-save').removeClass('disabled');
     $('#btn-save').addClass('btn-success');
}
