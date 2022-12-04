
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


let readImageURL= function(self) {
    let input = self.target;
    if (!(input.id && input.files && input.files[0])) { return; }

    var reader = new FileReader();

    let contentId = input.id.replace("upload", "");
    reader.onload = function (e) {
        $('#image' + contentId)
            .attr('src', e.target.result);
    };
    reader.readAsDataURL(input.files[0]);
}


let showImageFileName = function(self) {
    let input = self.target;

    if (!(input.id && input.files && input.files[0])) { return; }

    let contentId = input.id.replace("upload", "");
    let infoArea = $("#upload-label" + contentId)[0]
    debugger;
    let fileName = input.files[0].name;
    infoArea.textContent = fileName;
}


let showImageUpload = function(self) {
    readImageURL(self);
    showImageFileName(self);
}


let editImageContent = function(updateInd, imageContent) {
    let imageArea = $("#image" + updateInd);
    let infoArea = $("#upload-label" + updateInd);
    let originalCheck = $("#original-check" + updateInd);
    if (imageArea[0] == undefined || infoArea[0] == undefined || originalCheck[0] == undefined) { return; }

    imageArea.attr("src", imageContent["base64"]);
    originalCheck.prop("checked", imageContent["original"] === 1);
    infoArea.text(imageContent["file_name"]);
}


let editImageWhenInitialised = function(updateInd, imageContent, counter) {
    if (counter <= 0 || updateInd == undefined || imageContent == undefined){ return false; }

    if (!editImageContent(updateInd, imageContent)) {
        counter--;
        setTimeout(editImageWhenInitialised, 1000, updateInd, textContent, counter);
    }
}
