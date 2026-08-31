# Journal frontend

TypeScript port of the browser code that currently lives in `static/JS/*.js`. It builds a single
IIFE bundle that can eventually replace the nine per-file script tags in `templates/day.html`.

Everything this project produces stays inside `frontend/`. Nothing writes into `static/`, and
`static/JS/*.js` is still what the running app loads — the port is not wired up yet.

## Commands

Run these from this directory.

| Command | What it does |
| --- | --- |
| `npm install` | Installs dependencies. |
| `npm run build` | Writes `dist/journal.bundle.js` (plus a source map). |
| `npm run watch` | Same, rebuilding on change. |
| `npm test` | Runs the Vitest suite in jsdom. |
| `npm run coverage` | Test run with a V8 coverage report. |
| `npm run typecheck` | `tsc --noEmit` over `src` and `tests`. |

## Layout

```
src/
  common/utility.ts      <- static/JS/common.utility.js
  tinymce/helper.ts      <- static/JS/tiny.mce.helper.js
  entry/paragraph.ts     <- static/JS/entry.paragraph.js
  entry/image.ts         <- static/JS/entry.image.js
  entry/mesh.ts          <- static/JS/entry.mesh.js
  entry/delete.ts        <- static/JS/entry.delete.js
  entry/save.ts          <- static/JS/entry.save.js
  entry/load.ts          <- static/JS/entry.load.js
  entry/move.ts          <- static/JS/entry.move.js
  runtime/               Typed access to everything the templates own
  index.ts               The public API, one export per former global
  main.ts                Bundle entry point; copies index.ts onto window
```

## Why the vendor libraries are not bundled

`bootstrap`, `jquery` and `tinymce` are dependencies at the versions the app already ships
(4.5.2, 3.4.1 and the 7.8.0 that django-tinymce 5.0.0 vendors), but `src/runtime/externals.ts`
resolves them from `window` at call time instead of importing them.

That is deliberate while the migration is half-done. `templates/Common/header.html` loads jQuery
and Bootstrap as globals, and the inline `<script>` blocks in `templates/Modals/*.html` and
`templates/day.html` use `$` directly. Bootstrap attaches `$.fn.modal` to whichever jQuery is
global, so a second bundled copy of jQuery would silently lack the modal plugin. TinyMCE is
loaded by django-tinymce's `{{ tiny_mce.media }}` for the same reason.

The npm packages still earn their place: they supply the type definitions, and the test suite
runs against the real jQuery and Bootstrap builds.

## Migration order

1. **First** — decide how Django serves `dist/journal.bundle.js` (add `frontend/dist` to
   `STATICFILES_DIRS`, or point the build somewhere already served) and swap the nine script
   tags in `templates/day.html` for one tag pointing at it. `main.ts` republishes every former
   global, so nothing else has to change. Both switchover points are commented in the templates.
2. **Next** — move the handler wiring at the bottom of `day.html` into `main.ts`, and pass the
   templated values (`CONTENT_INDEX`, `DATE_SLUG`, the URLs, the two row templates) through a
   `{{ ...|json_script }}` block instead of `var` declarations. Then `src/runtime/config.ts`
   reads one object rather than eleven globals.
3. **Then** — port the inline scripts in `templates/Modals/*.html` into `src/`, which retires
   `src/runtime/modals.ts`.
4. **Last** — once no inline script uses `$`, import jQuery, Bootstrap and TinyMCE properly and
   drop the `window` lookups in `src/runtime/externals.ts` along with the vendor copies in
   `static/JS` and `static/CSS`.

## Notes on the port

The port is behaviour-preserving, including quirks worth knowing about:

- `refreshScrollSpies` looks for `[data-bs-spy="scroll"]` (Bootstrap 5) while the templates
  render `data-spy` (Bootstrap 4), so it is a no-op on every current page. Nothing calls it.
- `entry.delete.js` hands the whole AJAX response to `showMessageSimpleModal` on error, which
  renders `[object Object]`. `src/entry/delete.ts` does the same.
- `getContentType` and `getContentId` compared a `String.match` result against `undefined`
  rather than `null`, so a non-matching key threw instead of returning the intended fallback.
  The TypeScript version returns `''` and `-1` as the original clearly meant to.
- `window.location` cannot be stubbed in jsdom, so the two navigations go through
  `src/runtime/navigation.ts`. It does nothing except call `location.replace` / `location.reload`.
