
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
    CONTENT_INDEX += 1; // ToDo Consider making this stateless and getting max index
    return componentFromTemplate(generateParagraphTemplate(CONTENT_INDEX), 'div', 'row mt-3 paragraph-entry');
}


let editParagraphContent = function(updateInd, paragraphContent) {
    if (updateInd === undefined || paragraphContent === undefined) { return false; }
    let paragraphDiv = tinyMCE.get('paragraph' + updateInd);
    if (paragraphDiv === null) { return false; }

    paragraphDiv.setContent(paragraphContent["text"]);
    return true;
}


let editParagraphWhenInitialised = function(updateInd, paragraphContent, counter) {
    if (counter <= 0 || updateInd === undefined || paragraphContent === undefined) { return false; }

    if (!editParagraphContent(updateInd, paragraphContent)) {
         counter--;
         setTimeout(editParagraphWhenInitialised, 1000, updateInd, paragraphContent, counter);
    }
}
