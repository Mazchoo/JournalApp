
let createTinyMCE = function(component_name, height, initCallback=() => {}) {
    tinymce.init({
        selector: component_name,
        deprecation_warnings: false,
        browser_spellcheck: true,
        height: height,
        promotion: false,
        branding: false,
        license_key: "gpl",
        setup:function(editor) {
            editor.on('input', function(e) {
                enableSaveButton();
            }),
            editor.on('init', function(e) {
                initCallback();
            })
        },
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
