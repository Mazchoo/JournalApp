/**
 * Page-level DOM wrappers that do not come and go with content rows.
 * Call `bindPageComponents()` once the document (or a test fixture) is in place.
 */
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
import { ImageEntry } from './image-entry';
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
];

/** Drop dict entries whose rows were replaced with a new document. */
function forgetDetachedEntries(): void {
  for (const [key, entry] of Object.entries(ImageEntry.byIndex)) {
    if (!entry.row.isConnected) delete ImageEntry.byIndex[key];
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
}
