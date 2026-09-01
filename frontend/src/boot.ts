import { initializeServerRenderedContent } from './entry/load';
import { appendImageToList, zoomToImage } from './entry/image';
import { appendParagraphToList } from './entry/paragraph';
import { deleteContent, enableDeleteButton } from './entry/delete';
import { moveEntry } from './entry/move';
import { saveToDatabase } from './entry/save';
import { entryExists } from './runtime/config';
import { initializeCarousel } from './runtime/carousel';
import { bindModalBehaviors } from './runtime/modals';

/** Bind the day-page toolbar and image-zoom handlers. */
export function bindDayPageHandlers(): void {
  document.getElementById('btn-new-para')?.addEventListener('click', appendParagraphToList);
  document.getElementById('btn-new-image')?.addEventListener('click', appendImageToList);
  document.getElementById('btn-delete')?.addEventListener('click', deleteContent);
  document.getElementById('btn-save')?.addEventListener('click', saveToDatabase);
  document.getElementById('save-nav-button')?.addEventListener('click', (event) => {
    event.preventDefault();
    saveToDatabase();
  });
  document.getElementById('btn-move')?.addEventListener('click', moveEntry);

  document.querySelectorAll('.image-area').forEach((area) => {
    area.addEventListener('click', zoomToImage);
  });

  if (entryExists()) enableDeleteButton();
}

/**
 * Wire the page that loaded this bundle. The day editor, home carousel, and
 * modal markup are all optional: each path no-ops when its DOM is absent.
 */
export function boot(): void {
  bindModalBehaviors();
  initializeCarousel();

  if (document.getElementById('edit-area') !== null) {
    initializeServerRenderedContent();
    bindDayPageHandlers();
  }
}
