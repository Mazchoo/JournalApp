
module.exports.createTinyMCE = (component_name, height, initCallback=emptyFunction) => {
    tinymce.init({
        selector: component_name,
        deprecation_warnings: false,
        browser_spellcheck: true,
        height: height,
        setup:function(editor) {
            editor.on('change', function(e) {
                enableSaveButton();
            }),
            editor.on('init', function(e) {
                initCallback();
            })
        },
    });
}


module.exports.getMCEComponentHeight = (name) => {
    return tinymce.get(name).getContainer().clientHeight + 2;
}


module.exports.resetMCE = (div) => {
    if (!$(div).hasClass("paragraph-entry")) { return; }

    let divName = div.children[0].getAttribute('name');
    currentHeight = module.exports.getMCEComponentHeight(divName);
    tinymce.get(divName).remove();
    module.exports.createTinyMCE('#' + divName, currentHeight);
}
