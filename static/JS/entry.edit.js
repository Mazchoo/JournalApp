

let initializeNewParagraph = function(lastestId) {
    initializeTinyMCE('#paragraph' + lastestId);

    $('#delete-content' + lastestId).click(deleteParagraph);
    $('#insert-paragraph' + lastestId).click(insertNewParagraphToPosition);
    $('#insert-image' + lastestId).click(insertNewImageToPosition);
    $('#move-content-up' + lastestId).click(moveObjectUp);
    $('#move-content-down' + lastestId).click(moveObjectDown);
}


let insertNewParagraphToPosition = function(e) {
    let contendInd = String(CONTENT_INDEX + 1);
    return insertNewObjectIntoEditArea(e, createNewParagraph, initializeNewParagraph, contendInd);
}


let appendParagraphToList = function() {
    let div = createNewParagraph();
    if (div === undefined) {return;}

    $('#edit-area')[0].appendChild(div);
    initializeNewParagraph(String(CONTENT_INDEX));

    return div;
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
    if (div === undefined) {return;}

    $('#edit-area')[0].appendChild(div);
    initializeNewImage(String(CONTENT_INDEX));

    return div;
}