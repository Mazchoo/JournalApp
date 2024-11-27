
let generateSaveEntry = function(saveContent) {
     if (saveContent === null) return;
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
          } else if ($(content).hasClass("content-image") && content.src) {
               let ind = contentId.replace("image", "");
               let original = $("#original-check" + ind).is(":checked");
               let fileName = $("#upload-label" + ind)[0].textContent;
               saveData[contentId] = {
                    "file_path": fileName,
                    "original":  original,
                    "entry":     DATE_SLUG
               }
          } else if ($(content).hasClass("content-video") && content.src) {
               // Can be a video or an image
               let ind = contentId.replace("video", "").replace("image", "");
               let original = $("#original-check" + ind).is(":checked");
               let fileName = $("#upload-label" + ind)[0].textContent;
               saveData[`video${ind}`] = {
                    "file_path": fileName,
                    "original":  original,
                    "entry":     DATE_SLUG
               }
          }
     }

    return saveData;
} 


let saveEntryToDatabase = function(saveData) {
    if (saveData === null) return;
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
               if ("success" in response) showMessageSimpleModal('Save Success', response["success"]);
               if ("error" in response) showMessageSimpleModal('Save Errors', response["error"]);
               enableDeleteButton();
               $('.image-area').click(zoomToImage);
          },
          error: function(_jqXhr, _textStatus, errorThrown){
               showMessageSimpleModal('Unknown Error', errorThrown);
          },
          complete: function(_jqXhr, _textStatus) {
               $('#spinner-save').addClass("invisible");
          }
    })
}


let getSaveData = function() {
    let saveContent = $('.save-content');
    return generateSaveEntry(saveContent);
}


let saveToDatabase = function() {
     if ($('#btn-save').hasClass('disabled') || !$('#spinner-save').hasClass('invisible')) return;

     disableSaveButton();
     $('#spinner-save').removeClass('invisible');
     let saveData = getSaveData();
     window.scrollTo(0, document.body.scrollHeight);
     saveEntryToDatabase(saveData);
}

let enableSaveButton = function() {
     $('#btn-save').removeClass('disabled');
     $('#btn-save').removeClass('btn-outline-success');
     $('#btn-save').addClass('btn-success');
     $('#save-nav-button').removeClass('disabled');
}

let disableSaveButton = function() {
     $('#btn-save').removeClass('btn-success');
     $('#btn-save').addClass('disabled');
     $('#btn-save').addClass('btn-outline-success');
     $('#save-nav-button').addClass('disabled');
}
