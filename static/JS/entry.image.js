
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
    enableSaveButton();
}


let initializeNewImage = function(lastestId) {
    $('#upload' + lastestId).change(showImageUpload);
    
    $('#delete-content' + lastestId).click(deleteImage);
    $('#insert-paragraph' + lastestId).click(insertNewParagraphToPosition);
    $('#insert-image' + lastestId).click(insertNewImageToPosition);
    $('#move-content-up' + lastestId).click(moveObjectUp);
    $('#move-content-down' + lastestId).click(moveObjectDown);
    $("#original-check" + lastestId).click(enableSaveButton);
}


let insertNewImageToPosition = function(e) {
    let contendInd = String(CONTENT_INDEX + 1);
    enableSaveButton();
    return insertNewObjectIntoEditArea(e, createNewImage, initializeNewImage, contendInd);
}


let appendImageToList = function() {
    let div = createNewImage();
    if (div === undefined) return;

    $('#edit-area')[0].appendChild(div);
    initializeNewImage(String(CONTENT_INDEX));

    return div;
}


let readImageURL= function(inputFile, contentId) {
    var reader = new FileReader();

    reader.onload = function (e) {
        $('#video' + contentId).css({ visibility: 'hidden', height: 0 }); 
        $('#image' + contentId).attr('src', e.target.result);
        enableSaveButton();
    };
    reader.readAsDataURL(inputFile);
}

let readVideoURL= function(inputFile, contentId) {
    var reader = new FileReader();

    reader.onload = function (e) {''
        $('#video' + contentId).css({ visibility: 'visible' , height: 'auto' }); 
        $('#video' + contentId).attr('src', e.target.result);
        enableSaveButton();
    };
    reader.readAsDataURL(inputFile);
}

let showFileName = function(inputFile, contentId) {
    let infoArea = $("#upload-label" + contentId)[0]
    let fileName = inputFile.name;
    infoArea.textContent = fileName;
}


let uploadAllMediaFiles = function(contentInd, inputFiles) {
    for (let i = inputFiles.length - 1; i >= 0; i--) {
        if (i < inputFiles.length - 1) {
            $("#insert-image" + contentInd).click();
            contentInd = CONTENT_INDEX;
        }

        const inputFile = inputFiles[i];
        if (isVideoFile(inputFile.name)) {
            readVideoURL(inputFile, contentInd);
        } else if (isImageFile(inputFile.name)) {
            readImageURL(inputFile, contentInd);
        } else {
            console.log('Unknown media type')
        }
        
        showFileName(inputFile, contentInd);
    }
}


let showImageUpload = function(self) {
    let input = self.target;
    if (!(input.id && input.files)) return;

    let contentInd = input.id.replace("upload", "");
    uploadAllMediaFiles(contentInd, input.files);
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


let changeImageToVideoClass = function(updateInd) {
    let imageArea = $("#image" + updateInd);
    if (imageArea[0] == undefined) { return; }

    imageArea.removeClass("content-image");
    imageArea.addClass("content-video");
    imageArea.css({ visibility: 'visible', height: 'auto' }); 
    return true;
}


let editVideoWhenInitialised = function(updateInd, imageContent, counter) {
    if (counter <= 0 || updateInd == undefined || imageContent == undefined) return false;

    if (!editImageContent(updateInd, imageContent) || !changeImageToVideoClass(updateInd)) {
        counter--;
        setTimeout(editVideoWhenInitialised, 1000, updateInd, imageContent, counter);
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
            if ("base64" in response) imageSource = response["base64"];
            if ("error" in response) console.log(`Image error : ${response["error"]}`);
        },
        error: function(_jqXhr, _textStatus, errorThrown){
            console.log(`Unknown error : ${errorThrown}`)
        },
        complete: function(_jqXhr, _textStatus) {
            $('#image-preview').attr('src', imageSource);
            $('#image-modal').modal('show');
       }
   })
}
