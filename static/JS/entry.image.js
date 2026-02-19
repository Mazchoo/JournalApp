
let generateImageTemplate = function(contentInd) {
    return IMAGE_TEMPLATE.replaceAll('__INDEX__', contentInd);
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


let editImageMeta = function(updateInd, imageContent) {
    let infoArea = $("#upload-label" + updateInd);
    let originalCheck = $("#original-check" + updateInd);
    if (infoArea[0] == undefined || originalCheck[0] == undefined) { return; }

    originalCheck.prop("checked", imageContent["original"] === 1);
    infoArea.text(imageContent["file_name"]);
    return true;
}


let changeImageToVideoClass = function(updateInd) {
    let imageArea = $("#image" + updateInd);
    if (imageArea[0] == undefined) { return; }

    imageArea.removeClass("content-image");
    imageArea.addClass("content-video");
    imageArea.css({ visibility: 'visible', height: 'auto' }); 
    return true;
}


let zoomToImage = function() {
    const imageId = $(this).find('img').attr('id');
    const contentId = getContentId(imageId);

    if (contentId === undefined) return;
    const imageName = $('#upload-label' + contentId).html();
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    const image = $(this).find('img');
    let imageSource = image.attr('src');

    if ($(image).hasClass('content-image')) {
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
    } else if ($(image).hasClass('content-video')) {
        $.ajax({
            type: 'POST',
            url: VIDEO_URL,
            data: {
                "file": imageName,
                "csrfmiddlewaretoken": csrftoken,
                "name": DATE_SLUG
            },
            xhrFields: {
                responseType: 'blob'
            },
            success: function(response) {
                // Create a blob URL from the streaming video response
                const videoBlob = new Blob([response], { type: 'video/mp4' });
                imageSource = URL.createObjectURL(videoBlob);
            },
            error: function(jqXhr, _textStatus, errorThrown){
                // Check if response is JSON error
                if (jqXhr.responseJSON && "error" in jqXhr.responseJSON) {
                    console.log(`Video error : ${jqXhr.responseJSON["error"]}`);
                } else {
                    console.log(`Unknown error : ${errorThrown}`);
                }
            },
            complete: function(_jqXhr, _textStatus) {
                // Use the dedicated video modal
                $('#video-preview').attr('src', imageSource);
                $('#video-modal').modal('show');
            }
        })
    }

}
