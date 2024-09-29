
let reverseString = function(str) {
    return str.split("").reverse().join("");
}


let replaceExpression = function(str, expression, replacement) {
    return str.replace(expression, () => replacement);
}


let getIndexInArr = function(arr, obj) {
    for(i = 0; i < arr.length; i++) {
        if (arr[i] === obj) return i;
    }
}


let deleteParentDiv = function(obj) {
    if (obj === undefined || obj.parentNode === undefined || obj.parentNode.parentNode === undefined) return;
    obj.parentNode.parentNode.removeChild(obj.parentNode);
}


 let removeItem = function(obj) {
    if (obj === undefined || obj.parentNode === undefined) return;
    obj.parentNode.removeChild(obj);
}


 let componentFromTemplate = function(template, componentType, className) {
    let obj = document.createElement(componentType);
    obj.innerHTML = template;
    if (className !== undefined) {
        obj.className = className;
    }
    return obj;
}


let changeTooltipTextFromInput = function(e, idTag, suffix) {
    $(idTag)[0].innerHTML = e.target.value + suffix;
}


let reorderOneDivFromAnother = function(sourceTag, targetTag) {
    targetDiv  = $(targetTag)[0];
    sourceObjs = $(sourceTag);

    for (let i = 0; i < sourceObjs.length; i++) {
        targetItem = $(sourceObjs[i].getAttribute('name'))[0];
        targetDiv.appendChild(targetItem);
    }
}


let refreshScrollSpies = function() {
    var dataSpyList = [].slice.call(document.querySelectorAll('[data-bs-spy="scroll"]'))
    dataSpyList.forEach(function (dataSpyEl) {
        bootstrap.ScrollSpy.getInstance(dataSpyEl).refresh()
    })
}


let insertNewObjectIntoEditArea = function(e, newFunc, initFunc, contentInd) {
    let parentDiv = $(e.target.getAttribute('name'))[0];
    if (parentDiv === undefined) return;
    let div = newFunc();
    if (div === undefined) {return;}
    parentDiv = parentDiv.parentNode;

    $('#edit-area')[0].insertBefore(div, parentDiv)
    initFunc(contentInd);
    return div;
}


let getContentType = function(key) {
    let contentMatch = key.match(/([a-zA-Z]+)/g);
    if (contentMatch === undefined) return "";
    return contentMatch[0];
}


let getContentId = function(key) {
    let contentMatch = key.match(/([0-9]+)/g);
    if (contentMatch === undefined) return -1;
    return contentMatch[0];
}


let getParentDivOfObject = function(e) {
    let parentDiv = $(e.target.getAttribute('name'))[0];
    if  (parentDiv === undefined) return;
    return parentDiv.parentNode;
}


let moveObjectUp = function(e) {
    let parentDiv = getParentDivOfObject(e);
    let editAreaList = $('#edit-area')[0];
    let objInd = getIndexInArr(editAreaList.children, parentDiv)

    if (objInd === undefined || objInd == 0) return;

    editAreaList.insertBefore(parentDiv, editAreaList.children[objInd-1]);
    resetMCE(parentDiv);
    resetMCE(editAreaList.children[objInd]);
    enableSaveButton();
}


let moveObjectDown = function(e) {
    let parentDiv = getParentDivOfObject(e);
    let editAreaList = $('#edit-area')[0];
    let objInd = getIndexInArr(editAreaList.children, parentDiv)

    if (objInd === undefined || objInd == editAreaList.children.length-1) return;

    editAreaList.insertBefore(editAreaList.children[objInd + 1], parentDiv);
    resetMCE(parentDiv);
    resetMCE(editAreaList.children[objInd]);
    enableSaveButton();
}


let emptyFunction = function() {
    return;
}


const isVideoFile = function(fileName) {
    const fileExtention = fileName.split(".").pop().toLowerCase();
    return fileExtention === 'mp4';
}


const isImageFile = function(fileName) {
    const fileExtention = fileName.split(".").pop().toLowerCase();
    return ["jpg", "jpeg", "jfif", "png"].includes(fileExtention);
}
