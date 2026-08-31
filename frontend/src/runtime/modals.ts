/**
 * The modal helpers live in the inline `<script>` blocks of templates/Modals/*.html, so they
 * are treated as externals here in the same way as jQuery and TinyMCE.
 */

function missingModalHelper(name: string): never {
  throw new Error(`${name} is not available on window; templates/Modals/*.html must be included.`);
}

export function showCallbackModal(
  modalTitle: string,
  modalMessage: string,
  actionTitle: string,
  callback: () => void,
): void {
  const helper = window.showCallbackModal ?? missingModalHelper('showCallbackModal');
  helper(modalTitle, modalMessage, actionTitle, callback);
}

export function showMessageSimpleModal(modalTitle: string, modalMessage: unknown): void {
  const helper = window.showMessageSimpleModal ?? missingModalHelper('showMessageSimpleModal');
  helper(modalTitle, modalMessage);
}

export function showDateCallbackModal(
  modalTitle: string,
  modalMessage: string,
  actionTitle: string,
  callback: () => void,
): void {
  const helper = window.showDateCallbackModal ?? missingModalHelper('showDateCallbackModal');
  helper(modalTitle, modalMessage, actionTitle, callback);
}
