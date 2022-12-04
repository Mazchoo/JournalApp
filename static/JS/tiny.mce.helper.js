
let initializeTinyMCE = function(component_name) {
    tinymce.init({
        selector: component_name,
        deprecation_warnings: false,
        browser_spellcheck: true,
        height: 220,
    });
}


let resetMCE = function(div) {
    // MCE bugs out after divs get moved around
    if (!$(div).hasClass("paragraph-entry")) { return; }

    let divName = div.children[0].getAttribute('name');
    tinymce.get(divName).remove();
    initializeTinyMCE('#' + divName);
}