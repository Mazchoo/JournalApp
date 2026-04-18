
let createTinyMCE = function(component_name, height, allowSynthesis, initCallback=() => {}) {
    tinymce.init({
        selector: component_name,
        toolbar: 'bold italic | alignleft aligncenter alignright alignjustify | import allowSynthesis',
        deprecation_warnings: false,
        browser_spellcheck: true,
        height: height,
        promotion: false,
        branding: false,
        license_key: "gpl",
        setup:function(editor) {
            editor.ui.registry.addButton('import', {
                text: 'Import Markdown', onAction: function () {
                    console.log('TinyMCE button clicked');
                }
            });

            editor.ui.registry.addToggleButton('allowSynthesis', {
                text: 'Allow Synthesis',
                tooltip: "Allow content to create new AI generated content visible in the 'Derived Content' section",
                onAction: function(api) {
                    allowSynthesis = !allowSynthesis;
                    api.setActive(allowSynthesis);
                    editor.synthesisEnabled = allowSynthesis;
                    enableSaveButton();
                },
                onSetup: function(api) {
                    api.setActive(allowSynthesis);
                    editor.synthesisEnabled = allowSynthesis;
                    return function() {};
                }
            });

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
    let allowSynthesis = tinymce.get(divName).synthesisEnabled ?? true;
    tinymce.get(divName).remove();
    createTinyMCE('#' + divName, currentHeight, allowSynthesis, () => {});
}
