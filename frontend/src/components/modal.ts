import { PageElement } from './page-element';

/**
 * One Bootstrap 4 modal dialog. Show/hide, copy, and dismiss wiring live here
 * so callers do not query the document themselves.
 */
export class Modal extends PageElement {
  /** Instances keyed by element id, including those declared in `globals.ts`. */
  static readonly byId: Record<string, Modal> = {};

  private static behaviorsBound = false;

  constructor(
    elementId: string,
    private readonly onHidden?: () => void,
  ) {
    super(elementId);
    Modal.byId[elementId] = this;
  }

  /** Return the wrapper for `id`, creating one if it was not declared in globals. */
  static fromId(id: string): Modal {
    return Modal.byId[id] ?? new Modal(id);
  }

  /** Bind document-level dismiss and Enter-to-confirm listeners once. */
  static bindBehaviors(): void {
    if (Modal.behaviorsBound) return;
    Modal.behaviorsBound = true;

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const dismiss = target.closest('[data-dismiss="modal"]');
      if (dismiss !== null) {
        const modal = dismiss.closest('.modal');
        if (modal?.id) Modal.fromId(modal.id).hide();
        return;
      }

      if (target.classList.contains('modal-backdrop')) {
        Modal.hideOpen();
      }
    });

    document.addEventListener('keypress', (event) => {
      if (!isEnterKey(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const modal = target.closest('.modal');
      if (modal === null || !modal.id) return;

      const wrapper = Modal.fromId(modal.id);
      if (modal.id === 'callback-modal' || modal.id === 'date-modal') {
        wrapper.clickAction();
        return;
      }
      wrapper.clickClose();
    });
  }

  /** Hide the currently visible `.modal.show`, if any. */
  static hideOpen(): void {
    const open = document.querySelector('.modal.show');
    if (open?.id) Modal.fromId(open.id).hide();
  }

  /** Show this modal and add a backdrop if one is not already present. */
  show(): void {
    const modal = this.resolve();
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

  /** Hide this modal, drop the backdrop, and run `onHidden` if one was given. */
  hide(): void {
    const modal = this.resolve();
    if (modal === null) return;

    dispatchModalEvent(modal, 'hide.bs.modal');
    if (document.activeElement instanceof HTMLElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    modal.removeAttribute('aria-modal');

    document.querySelector('.modal-backdrop')?.remove();
    if (document.querySelector('.modal.show') === null) {
      document.body.classList.remove('modal-open');
    }

    dispatchModalEvent(modal, 'hidden.bs.modal');
    this.onHidden?.();
  }

  /** Replace this node with a clone so previous action listeners are discarded. */
  replaceWithClone(): void {
    const modal = this.resolve();
    if (modal === null || modal.parentNode === null) return;
    const cloned = modal.cloneNode(true) as HTMLElement;
    modal.parentNode.replaceChild(cloned, modal);
    this.node = cloned;
  }

  /** Write the title element (`#{id}-title`). */
  setTitle(text: string): void {
    const title = this.child('title');
    if (title !== null) title.innerText = text;
  }

  /** Write the body as plain text (`#{id}-body`). */
  setBodyText(text: string): void {
    const body = this.child('body');
    if (body !== null) body.innerText = text;
  }

  /** Write the body as HTML (`#{id}-body`). */
  setBodyHtml(html: string): void {
    const body = this.child('body');
    if (body !== null) body.innerHTML = html;
  }

  /** Label the action button and attach a one-shot confirm listener. */
  setAction(title: string, callback: () => void): void {
    const action = this.child('action');
    if (action === null) return;
    action.innerText = title;
    action.addEventListener('click', callback);
  }

  /** Click `#{id}-action` if it exists. */
  clickAction(): void {
    this.child('action')?.click();
  }

  /** Click `#{id}-close` if it exists. */
  clickClose(): void {
    this.child('close')?.click();
  }

  /**
   * Clone, fill title/body/action, and show. Used by the confirm and date modals.
   */
  showCallback(
    modalTitle: string,
    modalMessage: string,
    actionTitle: string,
    callback: () => void,
  ): void {
    this.replaceWithClone();
    this.setTitle(modalTitle);
    this.setBodyText(modalMessage);
    this.setAction(actionTitle, callback);
    this.show();
  }

  /** Fill title and HTML body, then show. Used by the simple message modal. */
  showMessage(modalTitle: string, modalMessage: unknown): void {
    this.setTitle(modalTitle);
    this.setBodyHtml(String(modalMessage));
    this.show();
  }

  /** Query `#{id}-{suffix}` inside this modal, logging if it is missing. */
  private child(suffix: 'title' | 'body' | 'action' | 'close'): HTMLElement | null {
    const modal = this.resolve();
    if (modal === null) return null;
    const child = modal.querySelector<HTMLElement>(`#${this.elementId}-${suffix}`);
    if (child === null) {
      console.error(`${this.constructor.name}: #${this.elementId}-${suffix} does not exist`);
    }
    return child;
  }
}

/** Dispatch a bubbling Bootstrap-style modal lifecycle event. */
function dispatchModalEvent(modal: HTMLElement, name: 'hide.bs.modal' | 'hidden.bs.modal'): void {
  modal.dispatchEvent(new Event(name, { bubbles: true }));
}

/** Return whether the key event is Enter, matching the old keypress handlers. */
function isEnterKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.which === 13 || event.keyCode === 13;
}
