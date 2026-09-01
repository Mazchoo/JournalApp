import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bindModalBehaviors,
  hideModal,
  showCallbackModal,
  showDateCallbackModal,
  showMessageSimpleModal,
  showModal,
} from '../src/runtime/modals';

/** Render the modal markup the helpers expect. */
function renderModals(): void {
  document.body.innerHTML = `
    <div class="modal fade" id="simple-modal">
      <h5 id="simple-modal-title">Title</h5>
      <div id="simple-modal-body">Message</div>
      <button id="simple-modal-close" data-dismiss="modal">Close</button>
    </div>
    <div class="modal fade" id="callback-modal">
      <h5 id="callback-modal-title">Title</h5>
      <div id="callback-modal-body">Message</div>
      <button id="callback-modal-action" data-dismiss="modal">Action</button>
    </div>
    <div class="modal fade" id="date-modal">
      <h5 id="date-modal-title">Title</h5>
      <div id="date-modal-body">Message</div>
      <button id="date-modal-action" data-dismiss="modal">Action</button>
    </div>
    <div class="modal fade" id="video-modal">
      <video id="video-preview" src="blob:old"></video>
    </div>`;
}

describe('showModal / hideModal', () => {
  beforeEach(() => {
    renderModals();
    bindModalBehaviors();
  });

  it('adds the show class and a backdrop', () => {
    showModal('simple-modal');

    expect(document.getElementById('simple-modal')!.classList.contains('show')).toBe(true);
    expect(document.querySelector('.modal-backdrop')).not.toBeNull();
    expect(document.body.classList.contains('modal-open')).toBe(true);
  });

  it('hides the modal and removes the backdrop', () => {
    showModal('simple-modal');
    hideModal('simple-modal');

    expect(document.getElementById('simple-modal')!.classList.contains('show')).toBe(false);
    expect(document.querySelector('.modal-backdrop')).toBeNull();
  });

  it('closes when a data-dismiss control is clicked', () => {
    showModal('simple-modal');

    document.getElementById('simple-modal-close')!.click();

    expect(document.getElementById('simple-modal')!.classList.contains('show')).toBe(false);
  });
});

describe('showMessageSimpleModal', () => {
  beforeEach(() => {
    renderModals();
  });

  it('fills the title and body and shows the modal', () => {
    showMessageSimpleModal('Saved', '<b>ok</b>');

    expect(document.getElementById('simple-modal-title')!.innerText).toBe('Saved');
    expect(document.getElementById('simple-modal-body')!.innerHTML).toBe('<b>ok</b>');
    expect(document.getElementById('simple-modal')!.classList.contains('show')).toBe(true);
  });
});

describe('showCallbackModal', () => {
  beforeEach(() => {
    renderModals();
    bindModalBehaviors();
  });

  it('fills the copy and runs the callback on confirm', () => {
    const callback = vi.fn();

    showCallbackModal('Sure?', 'Really delete?', 'Delete', callback);
    document.getElementById('callback-modal-action')!.click();

    expect(document.getElementById('callback-modal-title')!.innerText).toBe('Sure?');
    expect(document.getElementById('callback-modal-body')!.innerText).toBe('Really delete?');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('showDateCallbackModal', () => {
  beforeEach(() => {
    renderModals();
  });

  it('fills the copy and shows the date modal', () => {
    showDateCallbackModal('Move', 'Where to?', 'Confirm', () => {});

    expect(document.getElementById('date-modal-title')!.innerText).toBe('Move');
    expect(document.getElementById('date-modal-action')!.innerText).toBe('Confirm');
    expect(document.getElementById('date-modal')!.classList.contains('show')).toBe(true);
  });
});

describe('video modal cleanup', () => {
  beforeEach(() => {
    renderModals();
    bindModalBehaviors();
  });

  it('stops playback when the video modal hides', () => {
    const video = document.getElementById('video-preview') as HTMLVideoElement;
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => {});
    showModal('video-modal');
    hideModal('video-modal');

    expect(pause).toHaveBeenCalled();
    expect(video.getAttribute('src')).toBe('');
  });
});
