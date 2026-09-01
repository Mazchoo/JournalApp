import { requestDeleteEntry } from '../make-request';
import { dateSlug } from '../runtime/config';
import { showCallbackModal, showMessageSimpleModal } from '../runtime/modals';
import { reloadPage } from '../runtime/navigation';

/** Port of static/JS/entry.delete.js. */

/** Enable the delete button. */
export function enableDeleteButton(): void {
  const button = document.getElementById('btn-delete');
  if (button === null) return;
  button.classList.remove('disabled');
  button.classList.remove('btn-outline-danger');
  button.classList.add('btn-danger');
}

/** Disable the delete button. */
export function disableDeleteButton(): void {
  const button = document.getElementById('btn-delete');
  if (button === null) return;
  button.classList.remove('btn-danger');
  button.classList.add('disabled');
  button.classList.add('btn-outline-danger');
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
        document.getElementById('spinner-save')?.classList.add('invisible');
        disableDeleteButton();
      },
    },
  );
}

/** Confirm, then delete the current entry from the database. */
export function deleteContent(): void {
  if (document.getElementById('btn-delete')?.classList.contains('disabled')) return;

  showCallbackModal(
    'Are you sure?',
    'Delete this entry from database?',
    'Delete',
    deleteFromDatabase,
  );
}
