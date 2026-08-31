import * as journal from './index';

/**
 * Bundle entry point.
 *
 * The old static/JS files declared everything at top-level script scope, which made each
 * function a property of `window`. The inline `<script>` at the bottom of templates/day.html
 * still calls those names directly, so the bundle re-publishes them under the same names.
 * Once that inline block is moved into this project, this file can shrink to a single
 * bootstrap call and the globals can go away.
 */
Object.assign(window, journal);

export {};
