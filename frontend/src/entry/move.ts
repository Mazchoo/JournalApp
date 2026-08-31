import { dateSlug, moveUrl } from '../runtime/config';
import { csrfToken, jq } from '../runtime/externals';
import { showDateCallbackModal, showMessageSimpleModal } from '../runtime/modals';
import { replaceLocation } from '../runtime/navigation';

/** Port of static/JS/entry.move.js. */

export function getDestinationSlug(): string {
  const $ = jq();
  let destDay = String($('#date-modal-day').children('option:selected').val());
  if (destDay.length === 1) destDay = '0' + destDay;
  let destMonth = String(($('#date-modal-month').prop('selectedIndex') as number) + 1);
  if (destMonth.length === 1) destMonth = '0' + destMonth;
  const destYear = String($('#date-modal-year').children('option:selected').val());

  return `${destYear}-${destMonth}-${destDay}`;
}

export function makeMoveRequest(): void {
  const $ = jq();
  const csrftoken = csrfToken();
  const destinationSlug = getDestinationSlug();

  $('#spinner-save').removeClass('invisible');
  $.ajax({
    type: 'POST',
    url: moveUrl(),
    data: {
      csrfmiddlewaretoken: csrftoken,
      move_from: dateSlug(),
      move_to: destinationSlug,
    },
    success: (response: Record<string, string>) => {
      if ('error' in response) showMessageSimpleModal('Move Status', response['error']);
      if ('new_date' in response) replaceLocation(response['new_date']);
    },
    error: (_jqXhr, _textStatus, errorThrown) => {
      showMessageSimpleModal('Unknown Error', errorThrown);
    },
    complete: () => {
      $('#spinner-save').addClass('invisible');
    },
  });
}

export function moveEntry(): void {
  showDateCallbackModal(
    'Move Date',
    'What date do you want to move this entry to?',
    'Confirm',
    makeMoveRequest,
  );
}
