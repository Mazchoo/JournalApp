/**
 * Page-level DOM wrappers that do not come and go with content rows.
 * Call `bindPageComponents()` once the document (or a test fixture) is in place.
 */
import { initializeCarousel } from './carousel';
import {
  DateModalFields,
  DeleteButton,
  EditArea,
  ImagePreview,
  MoveButton,
  NewImageButton,
  NewParagraphButton,
  SaveButton,
  SaveNavButton,
  SaveSpinner,
  VideoPreview,
} from './static-elements';
import { MediaEntry } from './media-entry';
import { Modal } from './modal';
import { ParagraphEntry } from './paragraph-entry';

export const deleteButton = new DeleteButton();
export const saveButton = new SaveButton();
export const saveSpinner = new SaveSpinner();
export const saveNavButton = new SaveNavButton();
export const newParagraphButton = new NewParagraphButton();
export const newImageButton = new NewImageButton();
export const moveButton = new MoveButton();
export const editArea = new EditArea();
export const imagePreview = new ImagePreview();
export const videoPreview = new VideoPreview();
export const dateModal = new DateModalFields();
export const simpleModal = new Modal('simple-modal');
export const callbackModal = new Modal('callback-modal');
export const dateCallbackModal = new Modal('date-modal');
export const imageModal = new Modal('image-modal');
export const videoModal = new Modal('video-modal', () => videoPreview.reset());

const staticComponents = [
  deleteButton,
  saveButton,
  saveSpinner,
  saveNavButton,
  newParagraphButton,
  newImageButton,
  moveButton,
  editArea,
  imagePreview,
  videoPreview,
  simpleModal,
  callbackModal,
  dateCallbackModal,
  imageModal,
  videoModal,
];

/** Drop dict entries whose rows were replaced with a new document. */
function forgetDetachedEntries(): void {
  for (const [key, entry] of Object.entries(MediaEntry.byIndex)) {
    if (!entry.row.isConnected) delete MediaEntry.byIndex[key];
  }
  for (const [key, entry] of Object.entries(ParagraphEntry.byIndex)) {
    if (!entry.row.isConnected) delete ParagraphEntry.byIndex[key];
  }
}

/** Query every unchanging page control and discard stale row wrappers. */
export function bindPageComponents(): void {
  for (const component of staticComponents) {
    component.bind();
  }
  dateModal.bind();
  forgetDetachedEntries();
  initializeCarousel();
}
