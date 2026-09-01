# Journal frontend

TypeScript for the browser code that `templates/Common/header.html` loads as
`{% static 'journal.bundle.js' %}`. `npm run build` writes that file into
`frontend/dist/`. Django adds that folder to `STATICFILES_DIRS` so `{% static %}`
can resolve it.

The bundle boots itself: the day editor, home carousel, and modal helpers all live
in `src/`. Templates only supply markup and the Django-filled `var` values on the
day page.

## Commands

Run these from this directory.

| Command | What it does |
| --- | --- |
| `npm install` | Installs dependencies. |
| `npm run build` | Writes `frontend/dist/journal.bundle.js` plus a source map. |
| `npm run watch` | Same, rebuilding on change. |
| `npm test` | Runs the Vitest suite in jsdom. |
| `npm run coverage` | Test run with a V8 coverage report. |
| `npm run typecheck` | `tsc --noEmit` over `src` and `tests`. |

## Layout

```
src/
  common/utility.ts
  tinymce/helper.ts
  entry/               Paragraph, image, mesh, save, load, delete, move
  runtime/             Config, TinyMCE, modals, carousel, navigation
  request-interface.ts Typed POST bodies and JSON responses
  make-request.ts       fetch transport for those endpoints
  boot.ts              Page wiring
  index.ts             Public API
  main.ts              Bundle entry: publish API on window, then boot()
dist/                  Build output served by Django as /static/
```

## Vendor libraries

TinyMCE is still resolved from `window` at call time because django-tinymce's
`{{ tiny_mce.media }}` owns that instance. Bootstrap CSS stays in `static/css`;
the JS plugin (and jQuery) are gone. Modals and the home carousel are implemented
in `src/runtime/`.

## Notes

- `refreshScrollSpies` looks for `[data-bs-spy="scroll"]` (Bootstrap 5) while the
  templates render `data-spy` (Bootstrap 4), so it is a no-op on every current page.
  Nothing calls it.
- `entry.delete` hands the whole AJAX response to `showMessageSimpleModal` on
  error, which renders `[object Object]`.
- `window.location` cannot be stubbed in jsdom, so the two navigations go through
  `src/runtime/navigation.ts`.
