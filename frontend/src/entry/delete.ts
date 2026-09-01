import { dateSlug, deleteUrl } from '../runtime/config';
import { csrfToken, jq } from '../runtime/externals';
import { showCallbackModal, showMessageSimpleModal } from '../runtime/modals';
import { reloadPage } from '../runtime/navigation';

/** Port of static/JS/entry.delete.js. */

/** Enable the delete button. */
export function enableDeleteButton(): void {
  const $ = jq();
  $('#btn-delete').removeClass('disabled');
  $('#btn-delete').removeClass('btn-outline-danger');
  $('#btn-delete').addClass('btn-danger');
}

/** Disable the delete button. */
export function disableDeleteButton(): void {
  const $ = jq();
  $('#btn-delete').removeClass('btn-danger');
  $('#btn-delete').addClass('disabled');
  $('#btn-delete').addClass('btn-outline-danger');
}

/** POST a delete request for the current date slug. */
export function deleteFromDatabase(): void {
  const $ = jq();
  const csrftoken = csrfToken();

  $.ajax({
    type: 'POST',
    url: deleteUrl(),
    data: {
      csrfmiddlewaretoken: csrftoken,
      name: dateSlug(),
    },
    success: (response: Record<string, string>) => {
      // Forwards the whole response, matching the original entry.delete.js behaviour.
      if ('error' in response) showMessageSimpleModal('Delete Error', response);
      if ('success' in response) reloadPage();
    },
    error: (_jqXhr, _textStatus, errorThrown) => {
      showMessageSimpleModal('Unknown Error', errorThrown);
    },
    complete: () => {
      $('#spinner-save').addClass('invisible');
      disableDeleteButton();
    },
  });
}

/** Confirm, then delete the current entry from the database. */
export function deleteContent(): void {
  if (jq()('#btn-delete').hasClass('disabled')) return;

  showCallbackModal(
    'Are you sure?',
    'Delete this entry from database?',
    'Delete',
    deleteFromDatabase,
  );
}
