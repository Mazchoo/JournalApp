
let loadParagraphContent = function(paragraphContent) {
    appendParagraphToList(null, paragraphContent["height"], paragraphContent["text"]);
}


let loadImageContent = function(imageContent) {
    appendImageToList();
    editImageWhenInitialised(CONTENT_INDEX, imageContent, MAX_CHANGE_ATTEMPTS);
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
