
let generateImageTemplate = function(contentInd) {
    return replaceExpression(IMAGE_TEMPLATE, /%{contentInd}/g, contentInd);
}


let createNewImage = function() {
    CONTENT_INDEX += 1;
    return componentFromTemplate(generateImageTemplate(CONTENT_INDEX), 'div', 'row mt-4 image-entry');
}


let deleteImage = function(e) {
    let imageDivs = $(e.target.getAttribute('name'));
    deleteParentDiv(imageDivs[0]);
}


let initializeNewImage = function(lastestId) {
    $('#upload' + lastestId).change(showImageUpload);
    
    $('#delete-content' + lastestId).click(deleteImage);
    $('#insert-paragraph' + lastestId).click(insertNewParagraphToPosition);
    $('#insert-image' + lastestId).click(insertNewImageToPosition);
    $('#move-content-up' + lastestId).click(moveObjectUp);
    $('#move-content-down' + lastestId).click(moveObjectDown);
}


let insertNewImageToPosition = function(e) {
    let contendInd = String(CONTENT_INDEX + 1);
    return insertNewObjectIntoEditArea(e, createNewImage, initializeNewImage, contendInd);
}


let appendImageToList = function() {
    let div = createNewImage();
    if (div === undefined) return;

    $('#edit-area')[0].appendChild(div);
    initializeNewImage(String(CONTENT_INDEX));

    return div;
}


let readImageURL= function(inputFiles, fileInd, contentId) {
    var reader = new FileReader();

    reader.onload = function (e) {
        $('#image' + contentId).attr('src', e.target.result);
        enableSaveButton();
    };
    reader.readAsDataURL(inputFiles[fileInd]);
}


let showImageFileName = function(inputFiles, fileInd, contentId) {
    let infoArea = $("#upload-label" + contentId)[0]
    let fileName = inputFiles[fileInd].name;
    infoArea.textContent = fileName;
}


let uploadAllImageFiles = function(contentInd, inputFiles) {
    for (let i = inputFiles.length - 1; i >= 0; i--) {
        if (i < inputFiles.length - 1) {
            $("#insert-image" + contentInd).click();
            contentInd = CONTENT_INDEX;
        }
        readImageURL(inputFiles, i, contentInd);
        showImageFileName(inputFiles, i, contentInd);
    }
}


let showImageUpload = function(self) {
    let input = self.target;
    if (!(input.id && input.files)) return;

    let contentInd = input.id.replace("upload", "");
    uploadAllImageFiles(contentInd, input.files);
}


let editImageContent = function(updateInd, imageContent) {
    let imageArea = $("#image" + updateInd);
    let infoArea = $("#upload-label" + updateInd);
    let originalCheck = $("#original-check" + updateInd);
    if (imageArea[0] == undefined || infoArea[0] == undefined || originalCheck[0] == undefined) { return; }

    imageArea.attr("src", imageContent["base64"]);
    originalCheck.prop("checked", imageContent["original"] === 1);
    infoArea.text(imageContent["file_name"]);
    return true;
}


let editImageWhenInitialised = function(updateInd, imageContent, counter) {
    if (counter <= 0 || updateInd == undefined || imageContent == undefined) return false;

    if (!editImageContent(updateInd, imageContent)) {
        counter--;
        setTimeout(editImageWhenInitialised, 1000, updateInd, imageContent, counter);
    }
}


let zoomToImage = function() {
    let imageId = $(this).find('img').attr('id');
    let contentId = getContentId(imageId);

    if (contentId === undefined) return;
    let imageName = $('#upload-label' + contentId).html();
    let csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    let imageSource = $(this).find('img').attr('src');
    $.ajax({
        type: 'POST',
        url: IMAGE_URL,
        data: {
            "file": imageName,
            "csrfmiddlewaretoken": csrftoken,
            "name": DATE_SLUG
        },
        success: function(response) {
            imageSource = response["base64"];
        },
        error: function(_jqXhr, _textStatus, errorThrown){
            console.log("Image show error :" + errorThrown);
        },
        complete: function(_jqXhr, _textStatus) {
            $('#image-preview').attr('src', imageSource);
            $('#image-modal').modal('show');
       }
   })
}
