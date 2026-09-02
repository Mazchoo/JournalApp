import { deleteButton, saveSpinner } from '../components/globals';
import { requestDeleteEntry } from './make-request';
import { dateSlug } from '../runtime/backend-variables';
import { showCallbackModal, showMessageSimpleModal } from '../runtime/modals';
import { reloadPage } from '../runtime/navigation';

/** Port of static/JS/entry.delete.js. */

/** Enable the delete button. */
export function enableDeleteButton(): void {
  deleteButton.enable();
}

/** Disable the delete button. */
export function disableDeleteButton(): void {
  deleteButton.disable();
}

/** POST a delete request for the current date slug. */
export function deleteFromDatabase(): void {
  requestDeleteEntry(
    { name: dateSlug() },
    {
      success: (response) => {
        // Forwards the whole response, matching the original entry.delete.js behaviour.
        if ('error' in response) showMessageSimpleModal('Delete Error', response);
        if ('success' in response) reloadPage();
      },
      error: (_jqXhr, _textStatus, errorThrown) => {
        showMessageSimpleModal('Unknown Error', errorThrown);
      },
      complete: () => {
        saveSpinner.hide();
        disableDeleteButton();
      },
    },
  );
}

/** Confirm, then delete the current entry from the database. */
export function deleteContent(): void {
  if (deleteButton.isDisabled()) return;

  showCallbackModal(
    'Are you sure?',
    'Delete this entry from database?',
    'Delete',
    deleteFromDatabase,
  );
}
