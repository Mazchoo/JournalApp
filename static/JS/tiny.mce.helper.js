
let createTinyMCE = function(component_name, height) {
    tinymce.init({
        selector: component_name,
        deprecation_warnings: false,
        browser_spellcheck: true,
        height: height,
        setup:function(ed) {
            ed.on('change', function(e) {
                enableSaveButton();
            })
        }
    });
}


let getMCEComponentHeight = function(name) {
    return tinymce.get(name).getContainer().clientHeight + 2;
}


let resetMCE = function(div) {
    if (!$(div).hasClass("paragraph-entry")) { return; }

    let divName = div.children[0].getAttribute('name');
    currentHeight = getMCEComponentHeight(divName);
    tinymce.get(divName).remove();
    createTinyMCE('#' + divName, currentHeight);
}
