
let generateParagraphTemplate = function(contentInd) {
    return replaceExpression(PARAGRAPH_TEMPLATE, /%{contentInd}/g, contentInd);
}


let deleteParagraph = function(e) {
    let paragraphDivs = $(e.target.getAttribute('name'));
    let deleteParagraphs = function() {
         deleteParentDiv(paragraphDivs[0]);
    }

    let paragraphText = paragraphDivs.find(".tox-edit-area__iframe")[0];
    if (paragraphText !== undefined) {
         paragraphContent = paragraphText.contentDocument.body;
         if (paragraphContent.innerText.trim().length === 0) {
              deleteParagraphs();
              return;
         }
    }

    showCallbackModal(
         'Are you sure?', 
         'Are you sure you want to delete this non-empty paragraph? There is no way to undo this.',
         'Confirm', 
         deleteParagraphs
    )
}


let createNewParagraph = function() {
    CONTENT_INDEX += 1;
    return componentFromTemplate(generateParagraphTemplate(CONTENT_INDEX), 'div', 'row mt-3 paragraph-entry');
}


let editParagraphContent = function(updateInd, paragraphText) {
    if (updateInd === undefined || paragraphText === undefined) { return false; }
    let paragraphDiv = tinyMCE.get('paragraph' + updateInd);
    if (paragraphDiv === null) { return false; }

    paragraphDiv.setContent(paragraphText);
    return true;
}


let createInitFunction = function(updateInd, paragraphText) {
    if (paragraphText.length == 0) { return emptyFunction; }
    return function() { editParagraphContent(updateInd, paragraphText); };
}


let initializeNewParagraph = function(lastestId, height, paragraphText) {
    let initFunction = createInitFunction(lastestId, paragraphText);
    createTinyMCE('#paragraph' + lastestId, height, initFunction);

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


let appendParagraphToList = function(_e, height=220, paragraphText="") {
    let div = createNewParagraph();
    if (div === undefined) {return;}

    $('#edit-area')[0].appendChild(div);
    initializeNewParagraph(String(CONTENT_INDEX), height, paragraphText);

    return div;
}
