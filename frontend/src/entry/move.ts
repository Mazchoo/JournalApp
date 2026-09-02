import { dateModal, saveSpinner } from '../components/globals';
import { requestMoveEntry } from '../make-request';
import { dateSlug } from '../runtime/config';
import { showDateCallbackModal, showMessageSimpleModal } from '../runtime/modals';
import { replaceLocation } from '../runtime/navigation';

/** Port of static/JS/entry.move.js. */

/** Build a YYYY-MM-DD slug from the date modal selects. */
export function getDestinationSlug(): string {
  return dateModal.destinationSlug();
}

/** POST a move from the current date to the chosen destination. */
export function makeMoveRequest(): void {
  const destinationSlug = getDestinationSlug();

  saveSpinner.show();
  requestMoveEntry(
    {
      move_from: dateSlug(),
      move_to: destinationSlug,
    },
    {
      success: (response) => {
        if (response.error !== undefined) showMessageSimpleModal('Move Status', response.error);
        if (response.new_date !== undefined) replaceLocation(response.new_date);
      },
      error: (_jqXhr, _textStatus, errorThrown) => {
        showMessageSimpleModal('Unknown Error', errorThrown);
      },
      complete: () => {
        saveSpinner.hide();
      },
    },
  );
}

/** Open the date modal and move the entry once confirmed. */
export function moveEntry(): void {
  showDateCallbackModal(
    'Move Date',
    'What date do you want to move this entry to?',
    'Confirm',
    makeMoveRequest,
  );
}
