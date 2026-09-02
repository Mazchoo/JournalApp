import {
  callbackModal,
  dateCallbackModal,
  simpleModal,
} from '../components/globals';
import { Modal } from '../components/modal';

/**
 * Journal modal helpers. DOM work lives on `Modal`; these functions keep the
 * previous call sites (entry modules and tests) stable.
 */

/** Show a Bootstrap 4 modal by id. */
export function showModal(modalId: string): void {
  Modal.fromId(modalId).show();
}

/** Hide a Bootstrap 4 modal by id. */
export function hideModal(modalId: string): void {
  Modal.fromId(modalId).hide();
}

/** Bind document-level dismiss and keyboard listeners once. */
export function bindModalBehaviors(): void {
  Modal.bindBehaviors();
}

/** Show a confirm modal and run the callback on confirm. */
export function showCallbackModal(
  modalTitle: string,
  modalMessage: string,
  actionTitle: string,
  callback: () => void,
): void {
  callbackModal.showCallback(modalTitle, modalMessage, actionTitle, callback);
}

/** Show a simple message modal. */
export function showMessageSimpleModal(modalTitle: string, modalMessage: unknown): void {
  simpleModal.showMessage(modalTitle, modalMessage);
}

/** Show a date-picker modal and run the callback on confirm. */
export function showDateCallbackModal(
  modalTitle: string,
  modalMessage: string,
  actionTitle: string,
  callback: () => void,
): void {
  dateCallbackModal.showCallback(modalTitle, modalMessage, actionTitle, callback);
}
