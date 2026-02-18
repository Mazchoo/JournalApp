
let loadParagraphContent = function(paragraphContent) {
    appendParagraphToList(null, paragraphContent["height"], paragraphContent["text"]);
}


let loadImageContent = function(imageContent) {
    appendImageToList();
    let contentIndex = CONTENT_INDEX;

    editImageMetaWhenInitialised(contentIndex, imageContent, MAX_CHANGE_ATTEMPTS);

    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    $.ajax({
        type: 'POST',
        url: DOWNSIZED_IMAGE_URL,
        data: {
            "image_id": imageContent["image_id"],
            "csrfmiddlewaretoken": csrftoken,
        },
        success: function(response) {
            if ("base64" in response) {
                $("#image" + contentIndex).attr("src", response["base64"]);
            }
            if ("error" in response) {
                console.log('Image load error:', response["error"]);
            }
        },
        error: function(_jqXhr, _textStatus, errorThrown) {
            console.log('Failed to load image:', errorThrown);
        }
    });
}


let loadVideoContent = function(imageContent) {
    appendImageToList();
    editVideoWhenInitialised(CONTENT_INDEX, imageContent, MAX_CHANGE_ATTEMPTS);
}


let parseLoadedStoryContent = function(key, content) {
    let contentType = getContentType(key);
    if (contentType === undefined) return;

    if (contentType === 'paragraph') {
        loadParagraphContent(content);
    } else if (contentType === 'image') {
        loadImageContent(content);
    } else if (contentType === 'video') {
        loadVideoContent(content)
    } else {
        console.log('Unknown content loaded', contentType)
    }
}


let createBlankStory = function() {
    appendParagraphToList();
}


let intializeLoadedContent = function(loadedContent) {
    if (loadedContent === null) {
        createBlankStory();
    } else {
        for([key, textContent] of Object.entries(loadedContent)) {
            parseLoadedStoryContent(key, textContent);
        }
    }
    window.scrollTo(0, 0);
}
