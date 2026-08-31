import jquery from 'jquery';
import 'bootstrap';

// header.html loads jQuery and Bootstrap as globals before any app script runs, and Bootstrap
// registers its plugins (notably `$.fn.modal`) on that one jQuery instance. The tests use the
// real npm packages so they exercise the same wiring.
window.jQuery = jquery;
window.$ = jquery;

// jsdom does not implement scrolling; the app scrolls after saving and after loading content.
window.scrollTo = () => {};
