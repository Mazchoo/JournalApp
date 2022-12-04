
let loadParagraphContent = function(paragraphContent) {
    appendParagraphToList();
    editParagraphWhenInitialised(CONTENT_INDEX, paragraphContent, MAX_CHANGE_ATTEMPTS);
}


let loadImageContent = function(imageContent) {
    appendImageToList();
    editImageWhenInitialised(CONTENT_INDEX, imageContent, MAX_CHANGE_ATTEMPTS);
}


let parseLoadedStoryContent = function(key, content) {
    let contentType = getContentType(key);

    if (contentType !== undefined) {
        if (contentType === 'paragraph') {
            loadParagraphContent(content);
        } else if (contentType === 'image') {
            loadImageContent(content);
        }
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
}
