/**
 * The modal helpers live in the inline `<script>` blocks of templates/Modals/*.html, so they
 * are treated as externals here in the same way as jQuery and TinyMCE.
 */

/** Throw if a modal helper from the templates is absent. */
function missingModalHelper(name: string): never {
  throw new Error(`${name} is not available on window; templates/Modals/*.html must be included.`);
}

/** Show a confirm modal and run the callback on confirm. */
export function showCallbackModal(
  modalTitle: string,
  modalMessage: string,
  actionTitle: string,
  callback: () => void,
): void {
  const helper = window.showCallbackModal ?? missingModalHelper('showCallbackModal');
  helper(modalTitle, modalMessage, actionTitle, callback);
}

/** Show a simple message modal. */
export function showMessageSimpleModal(modalTitle: string, modalMessage: unknown): void {
  const helper = window.showMessageSimpleModal ?? missingModalHelper('showMessageSimpleModal');
  helper(modalTitle, modalMessage);
}

/** Show a date-picker modal and run the callback on confirm. */
export function showDateCallbackModal(
  modalTitle: string,
  modalMessage: string,
  actionTitle: string,
  callback: () => void,
): void {
  const helper = window.showDateCallbackModal ?? missingModalHelper('showDateCallbackModal');
  helper(modalTitle, modalMessage, actionTitle, callback);
}
