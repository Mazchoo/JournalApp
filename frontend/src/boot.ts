import { initializeServerRenderedContent } from './entry/load';
import { appendMediaToList, zoomToMedia } from './entry/media/media';
import { appendParagraphToList } from './entry/paragraph';
import { deleteContent, enableDeleteButton } from './entry/delete';
import { moveEntry } from './entry/move';
import { saveToDatabase } from './entry/save';
import { entryExists } from './runtime/backend-variables';
import { bindModalBehaviors } from './runtime/modals';
import {
  bindPageComponents,
  deleteButton,
  editArea,
  moveButton,
  newMediaButton,
  newParagraphButton,
  saveButton,
  saveNavButton,
} from './components/globals';

/** Bind the day-page toolbar and image-zoom handlers. */
export function bindDayPageHandlers(): void {
  newParagraphButton.onClick(appendParagraphToList);
  newMediaButton.onClick(appendMediaToList);
  deleteButton.onClick(deleteContent);
  saveButton.onClick(saveToDatabase);
  saveNavButton.onClick((event) => {
    event.preventDefault();
    saveToDatabase();
  });
  moveButton.onClick(moveEntry);

  editArea.onImageAreaClick(zoomToMedia);

  if (entryExists()) enableDeleteButton();
}

/**
 * Wire the page that loaded this bundle. The day editor, home carousel, and
 * modal markup are all optional: each path no-ops when its DOM is absent.
 */
export function boot(): void {
  bindPageComponents();
  bindModalBehaviors();

  if (editArea.exists()) {
    initializeServerRenderedContent();
    bindDayPageHandlers();
  }
}
