import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDestinationSlug, makeMoveRequest, moveEntry } from '../src/entry/move';
import { replaceLocation } from '../src/runtime/navigation';
import { stubAjax, type AjaxStub } from './helpers/ajax';
import { CSRF_TOKEN, installModalStubs, renderDayPage, type ModalStubs } from './helpers/dom';

vi.mock('../src/runtime/navigation');

let ajax: AjaxStub;
let modals: ModalStubs;

/** Select an option on a date-modal `<select>` by value. */
function selectOption(selectId: string, value: string): void {
  const select = document.getElementById(selectId) as HTMLSelectElement;
  select.value = value;
}

beforeEach(() => {
  vi.mocked(replaceLocation).mockClear();
  renderDayPage({ rows: ['paragraph'] });
  ajax = stubAjax();
  modals = installModalStubs();
});

describe('getDestinationSlug', () => {
  it('builds the slug from the three date selects', () => {
    expect(getDestinationSlug()).toBe('2024-03-15');
  });

  it('zero-pads a single digit day', () => {
    selectOption('date-modal-day', '2');

    expect(getDestinationSlug()).toBe('2024-03-02');
  });

  it('derives the month number from the selected index, not the label', () => {
    selectOption('date-modal-month', 'January');

    expect(getDestinationSlug()).toBe('2024-01-15');
  });

  it('follows the year select', () => {
    selectOption('date-modal-year', '2023');

    expect(getDestinationSlug()).toBe('2023-03-15');
  });
});

describe('moveEntry', () => {
  it('opens the date modal rather than moving straight away', () => {
    moveEntry();

    expect(modals.showDateCallbackModal).toHaveBeenCalledWith(
      'Move Date',
      'What date do you want to move this entry to?',
      'Confirm',
      makeMoveRequest,
    );
    expect(ajax.calls).toHaveLength(0);
  });

  it('posts the move once the modal is confirmed', () => {
    moveEntry();
    modals.confirmLast(modals.showDateCallbackModal);

    expect(ajax.last().url).toBe('/move-date/');
  });
});

describe('makeMoveRequest', () => {
  it('shows the spinner and posts the source and destination slugs', () => {
    makeMoveRequest();

    expect(document.getElementById('spinner-save')!.classList.contains('invisible')).toBe(false);
    const settings = ajax.last();
    expect(settings.type).toBe('POST');
    expect(settings.data).toEqual({
      csrfmiddlewaretoken: CSRF_TOKEN,
      move_from: '2024-03-15',
      move_to: '2024-03-15',
    });
  });

  it('navigates to the new date on success', () => {
    makeMoveRequest();
    ajax.succeed({ new_date: '/2024/April/1/' });

    expect(vi.mocked(replaceLocation)).toHaveBeenCalledWith('/2024/April/1/');
  });

  it('shows the reason and stays put when the server refuses', () => {
    makeMoveRequest();
    ajax.succeed({ error: 'Destination already has an entry' });

    expect(modals.showMessageSimpleModal).toHaveBeenCalledWith(
      'Move Status',
      'Destination already has an entry',
    );
    expect(vi.mocked(replaceLocation)).not.toHaveBeenCalled();
  });

  it('shows a modal on a transport error', () => {
    makeMoveRequest();
    ajax.fail('Bad Gateway');

    expect(modals.showMessageSimpleModal).toHaveBeenCalledWith('Unknown Error', 'Bad Gateway');
  });

  it('hides the spinner once the request settles', () => {
    makeMoveRequest();
    ajax.succeed({ error: 'nope' });

    expect(document.getElementById('spinner-save')!.classList.contains('invisible')).toBe(true);
  });
});
