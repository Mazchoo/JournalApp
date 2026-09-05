import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { vi, type MockInstance } from "vitest";

import { bindPageComponents } from "../../src/components/globals";
import * as modals from "../../src/runtime/modals";

const entryContents = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../templates/EntryContents",
);

export const PARAGRAPH_TEMPLATE = readFileSync(
  resolve(entryContents, "Paragraph.html"),
  "utf8",
);
export const MEDIA_TEMPLATE = readFileSync(
  resolve(entryContents, "Media.html"),
  "utf8",
);
const VIDEO_TEMPLATE = readFileSync(
  resolve(entryContents, "Video.html"),
  "utf8",
);

export const CSRF_TOKEN = "test-csrf-token";

export type RowKind = "paragraph" | "image" | "video";

/** Fill `{{ item.index }}` the same way generateParagraphTemplate / generateMediaTemplate do. */
function fillIndex(template: string, index: string): string {
  return template.replaceAll("{{ item.index }}", index);
}

/** Drop leftover `{{ item.data.* }}` tags after filling the index, as Django does for empty data. */
function withoutItemData(template: string): string {
  return template.replaceAll(/\{\{\s*item\.data\.[^}]+\}\}/g, "");
}

/** Render one content row of the given kind at the given index. */
function renderRow(kind: RowKind, index: string): string {
  if (kind === "paragraph") {
    return `<div class="row mt-3 paragraph-entry">${withoutItemData(fillIndex(PARAGRAPH_TEMPLATE, index))}</div>`;
  }

  if (kind === "video") {
    return `<div class="row mt-4 media-entry">${withoutItemData(
      fillIndex(VIDEO_TEMPLATE, index).replaceAll(
        "{{ item.data.video_id }}",
        `v${index}`,
      ),
    ).replaceAll(
      "{% if item.data.allow_ai_synthesis %}checked{% endif %}",
      "",
    )}</div>`;
  }

  return `<div class="row mt-4 media-entry">${withoutItemData(
    fillIndex(MEDIA_TEMPLATE, index).replaceAll(
      "{{ item.data.image_id }}",
      `i${index}`,
    ),
  ).replaceAll(
    "{% if item.data.allow_ai_synthesis %}btn-primary{% else %}btn-outline-secondary{% endif %}",
    "btn-outline-secondary",
  )}</div>`;
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
            ${rows.map((kind, index) => renderRow(kind, String(index))).join("\n")}
        </div>
        <div class="row mt-3 px-5">
            <button class="btn btn-dark" id="btn-new-para">New Paragraph</button>
            <button class="btn btn-dark" id="btn-new-media">New Media</button>
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
  bindPageComponents();
}

/** Mirror the var declarations from templates/day.html. */
export function installTemplateGlobals(contentIndex: number): void {
  window.CONTENT_INDEX = contentIndex;
  window.PARAGRAPH_TEMPLATE = PARAGRAPH_TEMPLATE;
  window.MEDIA_TEMPLATE = MEDIA_TEMPLATE;
  window.DATE_SLUG = "2024-03-15";
  window.ENTRY_EXISTS = false;
  window.SAVE_URL = "/save-entry/";
  window.DELETE_URL = "/delete-entry/";
  window.IMAGE_URL = "/get-image/";
  window.DOWNSIZED_IMAGE_URL = "/get-downsized-image/";
  window.VIDEO_URL = "/get-video/";
  window.DOWNSIZED_VIDEO_IMAGE_URL = "/get-downsized-video-image/";
  window.MOVE_URL = "/move-date/";
}

export interface ModalStubs {
  showCallbackModal: MockInstance;
  showMessageSimpleModal: MockInstance;
  showDateCallbackModal: MockInstance;
  /** Run the callback the last `showCallbackModal` / `showDateCallbackModal` was given. */
  confirmLast(stub: MockInstance): void;
}

/** Stand in for the real modal helpers so tests can assert they were shown. */
export function installModalStubs(): ModalStubs {
  const showCallbackModal = vi
    .spyOn(modals, "showCallbackModal")
    .mockImplementation(() => {});
  const showMessageSimpleModal = vi
    .spyOn(modals, "showMessageSimpleModal")
    .mockImplementation(() => {});
  const showDateCallbackModal = vi
    .spyOn(modals, "showDateCallbackModal")
    .mockImplementation(() => {});

  return {
    showCallbackModal,
    showMessageSimpleModal,
    showDateCallbackModal,
    /** Run the callback the last confirm or date modal was given. */
    confirmLast: (stub: MockInstance) => {
      const call = stub.mock.calls[stub.mock.calls.length - 1];
      if (call === undefined) throw new Error("The modal was never shown.");
      (call[3] as () => void)();
    },
  };
}

/** Build a File whose extension drives media-type branching. */
export function fileNamed(name: string, contents = "x", type = ""): File {
  return new File([contents], name, { type });
}

/** Define innerText on an element, which jsdom does not implement. */
export function defineInnerText(element: HTMLElement, value: string): void {
  Object.defineProperty(element, "innerText", { value, configurable: true });
}
