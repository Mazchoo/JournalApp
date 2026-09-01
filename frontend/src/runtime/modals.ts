/**
 * Bootstrap 4-compatible modal show/hide, plus the three journal modal helpers
 * that used to live as inline scripts in templates/Modals/*.html.
 */

let modalBehaviorsBound = false;

/** Dispatch a bubbling Bootstrap-style modal lifecycle event. */
function dispatchModalEvent(modal: HTMLElement, name: 'hide.bs.modal' | 'hidden.bs.modal'): void {
  modal.dispatchEvent(new Event(name, { bubbles: true }));
}

/** Show a Bootstrap 4 modal by id. */
export function showModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (modal === null) return;

  modal.style.display = 'block';
  modal.classList.add('show');
  modal.setAttribute('aria-modal', 'true');
  modal.removeAttribute('aria-hidden');
  document.body.classList.add('modal-open');

  if (document.querySelector('.modal-backdrop') === null) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(backdrop);
  }
}

/** Hide a Bootstrap 4 modal by id. */
export function hideModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (modal === null) return;

  dispatchModalEvent(modal, 'hide.bs.modal');
  modal.classList.remove('show');
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  modal.removeAttribute('aria-modal');

  document.querySelector('.modal-backdrop')?.remove();
  if (document.querySelector('.modal.show') === null) {
    document.body.classList.remove('modal-open');
  }
  dispatchModalEvent(modal, 'hidden.bs.modal');
}

/** Replace a modal node with a clone so previous action listeners are discarded. */
function replaceWithClone(modalId: string): HTMLElement | null {
  const modal = document.getElementById(modalId);
  if (modal === null || modal.parentNode === null) return null;
  const cloned = modal.cloneNode(true) as HTMLElement;
  modal.parentNode.replaceChild(cloned, modal);
  return cloned;
}

/** Return whether the key event is Enter, matching the old keypress handlers. */
function isEnterKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.which === 13 || event.keyCode === 13;
}

/** Bind document-level dismiss, keyboard, and video-cleanup listeners once. */
export function bindModalBehaviors(): void {
  if (modalBehaviorsBound) return;
  modalBehaviorsBound = true;

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const dismiss = target.closest('[data-dismiss="modal"]');
    if (dismiss !== null) {
      const modal = dismiss.closest('.modal');
      if (modal?.id) hideModal(modal.id);
      return;
    }

    if (target.classList.contains('modal-backdrop')) {
      const open = document.querySelector('.modal.show');
      if (open?.id) hideModal(open.id);
    }
  });

  document.addEventListener('keypress', (event) => {
    if (!isEnterKey(event)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const modal = target.closest('.modal');
    if (modal === null) return;

    if (modal.id === 'callback-modal' || modal.id === 'date-modal') {
      document.getElementById(`${modal.id}-action`)?.click();
      return;
    }

    const close = modal.querySelector<HTMLElement>('[id$="-modal-close"]');
    close?.click();
  });

  document.addEventListener('hide.bs.modal', (event) => {
    const modal = event.target;
    if (!(modal instanceof HTMLElement)) return;
    if (document.activeElement instanceof HTMLElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  });

  document.addEventListener('hidden.bs.modal', (event) => {
    const modal = event.target;
    if (!(modal instanceof HTMLElement) || modal.id !== 'video-modal') return;
    const video = document.getElementById('video-preview') as HTMLVideoElement | null;
    if (video === null) return;
    video.pause();
    video.currentTime = 0;
    video.src = '';
  });
}

/** Show a confirm modal and run the callback on confirm. */
export function showCallbackModal(
  modalTitle: string,
  modalMessage: string,
  actionTitle: string,
  callback: () => void,
): void {
  replaceWithClone('callback-modal');
  const title = document.getElementById('callback-modal-title');
  const body = document.getElementById('callback-modal-body');
  const action = document.getElementById('callback-modal-action');
  if (title !== null) title.innerText = modalTitle;
  if (body !== null) body.innerText = modalMessage;
  if (action !== null) {
    action.innerText = actionTitle;
    action.addEventListener('click', callback);
  }
  showModal('callback-modal');
}

/** Show a simple message modal. */
export function showMessageSimpleModal(modalTitle: string, modalMessage: unknown): void {
  const title = document.getElementById('simple-modal-title');
  const body = document.getElementById('simple-modal-body');
  if (title !== null) title.innerText = modalTitle;
  if (body !== null) body.innerHTML = String(modalMessage);
  showModal('simple-modal');
}

/** Show a date-picker modal and run the callback on confirm. */
export function showDateCallbackModal(
  modalTitle: string,
  modalMessage: string,
  actionTitle: string,
  callback: () => void,
): void {
  replaceWithClone('date-modal');
  const title = document.getElementById('date-modal-title');
  const body = document.getElementById('date-modal-body');
  const action = document.getElementById('date-modal-action');
  if (title !== null) title.innerText = modalTitle;
  if (body !== null) body.innerText = modalMessage;
  if (action !== null) {
    action.innerText = actionTitle;
    action.addEventListener('click', callback);
  }
  showModal('date-modal');
}
