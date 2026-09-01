import { requestMoveEntry } from '../make-request';
import { dateSlug } from '../runtime/config';
import { showDateCallbackModal, showMessageSimpleModal } from '../runtime/modals';
import { replaceLocation } from '../runtime/navigation';

/** Port of static/JS/entry.move.js. */

/** Return the selected option value of a `<select>`, or an empty string. */
function selectedValue(selectId: string): string {
  const select = document.getElementById(selectId) as HTMLSelectElement | null;
  return select?.value ?? '';
}

/** Build a YYYY-MM-DD slug from the date modal selects. */
export function getDestinationSlug(): string {
  let destDay = selectedValue('date-modal-day');
  if (destDay.length === 1) destDay = '0' + destDay;
  const monthSelect = document.getElementById('date-modal-month') as HTMLSelectElement | null;
  let destMonth = String((monthSelect?.selectedIndex ?? 0) + 1);
  if (destMonth.length === 1) destMonth = '0' + destMonth;
  const destYear = selectedValue('date-modal-year');

  return `${destYear}-${destMonth}-${destDay}`;
}

/** POST a move from the current date to the chosen destination. */
export function makeMoveRequest(): void {
  const destinationSlug = getDestinationSlug();

  document.getElementById('spinner-save')?.classList.remove('invisible');
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
        document.getElementById('spinner-save')?.classList.add('invisible');
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
