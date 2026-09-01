import { vi, type Mock } from 'vitest';

/**
 * Fixtures mirroring what Django renders for templates/day.html. The two `*_TEMPLATE` strings
 * are the same `__INDEX__` placeholders day.html injects, so server-rendered rows and
 * client-created rows come from one source here as well.
 */

export const PARAGRAPH_TEMPLATE = `
<div class='col col-md-11 py-2 border border-dark rounded bg-white mt-2 entry-region-__INDEX__' name='paragraph__INDEX__'>
    <form method='get' action='' class='card container'>
        <textarea class='entry-text save-content' name='message' id='paragraph__INDEX__' data-height='220' data-allow-ai-synthesis='1'></textarea>
    </form>
</div>
<div class='col col-md-1 py-2 entry-region-__INDEX__'>
    <button id='delete-content__INDEX__' class='edit-button' name='.entry-region-__INDEX__'></button>
    <button id='insert-paragraph__INDEX__' class='edit-button' name='.entry-region-__INDEX__'></button>
    <button id='insert-image__INDEX__' class='edit-button' name='.entry-region-__INDEX__'></button>
    <button id='move-content-up__INDEX__' class='edit-button' name='.entry-region-__INDEX__'></button>
    <button id='move-content-down__INDEX__' class='edit-button' name='.entry-region-__INDEX__'></button>
</div>`;

export const IMAGE_TEMPLATE = `
<div class='row mx-auto entry-region-__INDEX__'>
    <div class='col col-md-11 upload-box input-group'>
        <input id='upload__INDEX__' type='file' multiple='multiple' class='upload-image'>
        <label id='upload-label__INDEX__' for='upload__INDEX__' class='upload-label'></label>
    </div>
    <div class='col col-md-1 py-2'>
        <button id='allow-syn__INDEX__' type='button' class='btn btn-sm btn-outline-secondary allow-syn'>Generate</button>
    </div>
</div>
<div class='col col-md-11 py-2 border border-dark rounded bg-white mt-2 entry-region-__INDEX__' name='image__INDEX__'>
    <form method='get' action='' class='card container image-container'>
        <div class='image-area'>
            <img id='image__INDEX__' alt='' class='save-content content-image' data-image-id=''>
            <video id='video__INDEX__' controls='controls' class='save-content content-video'></video>
            <canvas id='mesh-canvas__INDEX__' class='save-content content-mesh' style='visibility: hidden; height: 0;'></canvas>
        </div>
    </form>
</div>
<div class='col col-md-1 py-2 entry-region-__INDEX__'>
    <button id='delete-content__INDEX__' class='edit-button' name='.entry-region-__INDEX__'></button>
    <button id='insert-paragraph__INDEX__' class='edit-button' name='.entry-region-__INDEX__'></button>
    <button id='insert-image__INDEX__' class='edit-button' name='.entry-region-__INDEX__'></button>
    <button id='move-content-up__INDEX__' class='edit-button' name='.entry-region-__INDEX__'></button>
    <button id='move-content-down__INDEX__' class='edit-button' name='.entry-region-__INDEX__'></button>
</div>`;

export const CSRF_TOKEN = 'test-csrf-token';

export type RowKind = 'paragraph' | 'image' | 'video';

/** Render one content row of the given kind at the given index. */
function renderRow(kind: RowKind, index: number): string {
  if (kind === 'paragraph') {
    return `<div class="row mt-3 paragraph-entry">${PARAGRAPH_TEMPLATE.replaceAll('__INDEX__', String(index))}</div>`;
  }

  const markup = IMAGE_TEMPLATE.replaceAll('__INDEX__', String(index));
  if (kind === 'video') {
    return `<div class="row mt-4 image-entry">${markup
      .replace(`class='save-content content-image' data-image-id=''`, `class='save-content content-video' data-video-id='v${index}'`)}</div>`;
  }
  return `<div class="row mt-4 image-entry">${markup.replace(`data-image-id=''`, `data-image-id='i${index}'`)}</div>`;
}

export interface DayPageOptions {
  /** Content rows to server-render into `#edit-area`, in order. */
  rows?: RowKind[];
  /** Value for `CONTENT_INDEX`; defaults to the number of rows, as day.html does. */
  contentIndex?: number;
}

/** Render the parts of templates/day.html that the JS touches. */
export function renderDayPage(options: DayPageOptions = {}): void {
  const rows = options.rows ?? [];

  document.body.innerHTML = `
    <div class="container">
        <div id="edit-area" data-spy="scroll">
            ${rows.map((kind, index) => renderRow(kind, index)).join('\n')}
        </div>
        <div class="row mt-3 px-5">
            <button class="btn btn-dark" id="btn-new-para">New Paragraph</button>
            <button class="btn btn-dark" id="btn-new-image">New Image</button>
            <button class="btn btn-outline-danger disabled" id="btn-delete">Delete</button>
            <button class="btn btn-outline-success disabled" id="btn-save">Save</button>
            <button class="btn btn-info" id="btn-move">Move</button>
            <button class="btn btn-dark invisible" id="spinner-save" type="button" disabled></button>
        </div>
        <a class="nav-link disabled" id="save-nav-button" href="#">Save</a>
        <input type="hidden" name="csrfmiddlewaretoken" value="${CSRF_TOKEN}">
    </div>

    <div class="modal" id="image-modal" tabindex="-1">
        <div class="modal-dialog"><div class="modal-content"><div class="modal-body">
            <img id="image-preview" src="">
        </div></div></div>
    </div>
    <div class="modal" id="video-modal" tabindex="-1">
        <div class="modal-dialog"><div class="modal-content"><div class="modal-body">
            <video id="video-preview" src=""></video>
        </div></div></div>
    </div>

    <div class="modal" id="date-modal" tabindex="-1">
        <select id="date-modal-day">
            <option>1</option><option>2</option><option selected>15</option>
        </select>
        <select id="date-modal-month">
            <option>January</option><option>February</option><option selected>March</option>
        </select>
        <select id="date-modal-year">
            <option>2023</option><option selected>2024</option>
        </select>
    </div>`;

  installTemplateGlobals(options.contentIndex ?? rows.length);
}

/** Mirror the var declarations from templates/day.html. */
export function installTemplateGlobals(contentIndex: number): void {
  window.CONTENT_INDEX = contentIndex;
  window.PARAGRAPH_TEMPLATE = PARAGRAPH_TEMPLATE;
  window.IMAGE_TEMPLATE = IMAGE_TEMPLATE;
  window.THREE_JS_URL = '/static/JS/three.webgpu.full.min.js';
  window.DATE_SLUG = '2024-03-15';
  window.SAVE_URL = '/save-entry/';
  window.DELETE_URL = '/delete-entry/';
  window.IMAGE_URL = '/get-image/';
  window.DOWNSIZED_IMAGE_URL = '/get-downsized-image/';
  window.VIDEO_URL = '/get-video/';
  window.DOWNSIZED_VIDEO_IMAGE_URL = '/get-downsized-video-image/';
  window.MOVE_URL = '/move-date/';
}

export interface ModalStubs {
  showCallbackModal: Mock;
  showMessageSimpleModal: Mock;
  showDateCallbackModal: Mock;
  /** Run the callback the last `showCallbackModal` / `showDateCallbackModal` was given. */
  confirmLast(stub: Mock): void;
}

/** Stand in for the helpers defined inline by templates/Modals/*.html. */
export function installModalStubs(): ModalStubs {
  const showCallbackModal = vi.fn();
  const showMessageSimpleModal = vi.fn();
  const showDateCallbackModal = vi.fn();

  window.showCallbackModal = showCallbackModal as unknown as Window['showCallbackModal'];
  window.showMessageSimpleModal =
    showMessageSimpleModal as unknown as Window['showMessageSimpleModal'];
  window.showDateCallbackModal =
    showDateCallbackModal as unknown as Window['showDateCallbackModal'];

  return {
    showCallbackModal,
    showMessageSimpleModal,
    showDateCallbackModal,
    /** Run the callback the last confirm or date modal was given. */
    confirmLast: (stub: Mock) => {
      const call = stub.mock.calls[stub.mock.calls.length - 1];
      if (call === undefined) throw new Error('The modal was never shown.');
      (call[3] as () => void)();
    },
  };
}

/** Build a File whose extension drives media-type branching. */
export function fileNamed(name: string, contents = 'x', type = ''): File {
  return new File([contents], name, { type });
}

/** Define innerText on an element, which jsdom does not implement. */
export function defineInnerText(element: HTMLElement, value: string): void {
  Object.defineProperty(element, 'innerText', { value, configurable: true });
}
