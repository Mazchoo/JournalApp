import { enableSaveButton } from '../entry/save';
import { resetMCE } from '../tinymce/helper';
import { bs, jq } from '../runtime/externals';

/** Port of static/JS/common.utility.js. */

/** Reverse the characters of a string. */
export function reverseString(str: string): string {
  return str.split('').reverse().join('');
}

/** Return the first index of an object in an array-like collection. */
export function getIndexInArr<T>(arr: ArrayLike<T>, obj: T): number | undefined {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === obj) return i;
  }
  return undefined;
}

/** Remove an element's parent node from the grandparent. */
export function deleteParentDiv(obj: Element | null | undefined): void {
  if (obj == null || obj.parentNode == null || obj.parentNode.parentNode == null) return;
  obj.parentNode.parentNode.removeChild(obj.parentNode);
}

/** Remove an element from its parent. */
export function removeItem(obj: Element | null | undefined): void {
  if (obj == null || obj.parentNode == null) return;
  obj.parentNode.removeChild(obj);
}

/** Build an HTML element from a template string. */
export function componentFromTemplate(
  template: string,
  componentType: string,
  className?: string,
): HTMLElement {
  const obj = document.createElement(componentType);
  obj.innerHTML = template;
  if (className !== undefined) {
    obj.className = className;
  }
  return obj;
}

/** Set a tooltip's text from an input value plus a suffix. */
export function changeTooltipTextFromInput(e: Event, idTag: string, suffix: string): void {
  const input = e.target as HTMLInputElement;
  jq()(idTag)[0].innerHTML = input.value + suffix;
}

/** Move named children from one container into another. */
export function reorderOneDivFromAnother(sourceTag: string, targetTag: string): void {
  const $ = jq();
  const targetDiv = $(targetTag)[0];
  const sourceObjs = $(sourceTag);

  for (let i = 0; i < sourceObjs.length; i++) {
    const targetItem = $(nameSelector(sourceObjs[i]))[0];
    targetDiv.appendChild(targetItem);
  }
}

/** Refresh every Bootstrap scroll spy on the page. */
export function refreshScrollSpies(): void {
  const dataSpyList = Array.from(document.querySelectorAll('[data-bs-spy="scroll"]'));
  dataSpyList.forEach((dataSpyEl) => {
    bs().ScrollSpy.getInstance(dataSpyEl)!.refresh();
  });
}

/** Insert a new content row above the clicked row. */
export function insertNewObjectIntoEditArea(
  e: JQuery.TriggeredEvent,
  newFunc: () => HTMLElement | undefined,
  initFunc: (contentInd: string) => void,
  contentInd: string,
): HTMLElement | undefined {
  const $ = jq();
  let parentDiv = $(eventNameSelector(e))[0];
  if (parentDiv === undefined) return undefined;
  const div = newFunc();
  if (div === undefined) return undefined;
  parentDiv = parentDiv.parentNode as HTMLElement;

  $('#edit-area')[0].insertBefore(div, parentDiv);
  initFunc(contentInd);
  return div;
}

/** Extract the leading alphabetic type from an element id. */
export function getContentType(key: string): string {
  const contentMatch = key.match(/([a-zA-Z]+)/g);
  if (contentMatch === null) return '';
  return contentMatch[0];
}

/** Extract the numeric id from an element id. */
export function getContentId(key: string): string | -1 {
  const contentMatch = key.match(/([0-9]+)/g);
  if (contentMatch === null) return -1;
  return contentMatch[0];
}

/** Return the parent row of the clicked edit button. */
export function getParentDivOfObject(e: JQuery.TriggeredEvent): HTMLElement | undefined {
  const parentDiv = jq()(eventNameSelector(e))[0];
  if (parentDiv === undefined) return undefined;
  return parentDiv.parentNode as HTMLElement;
}

/** Move a content row one position earlier in the edit area. */
export function moveObjectUp(e: JQuery.TriggeredEvent): void {
  const parentDiv = getParentDivOfObject(e);
  const editAreaList = jq()('#edit-area')[0];
  const objInd = getIndexInArr(editAreaList.children, parentDiv as Element);

  if (objInd === undefined || objInd === 0) return;

  editAreaList.insertBefore(parentDiv as HTMLElement, editAreaList.children[objInd - 1]);
  resetMCE(parentDiv);
  resetMCE(editAreaList.children[objInd]);
  enableSaveButton();
}

/** Move a content row one position later in the edit area. */
export function moveObjectDown(e: JQuery.TriggeredEvent): void {
  const parentDiv = getParentDivOfObject(e);
  const editAreaList = jq()('#edit-area')[0];
  const objInd = getIndexInArr(editAreaList.children, parentDiv as Element);

  if (objInd === undefined || objInd === editAreaList.children.length - 1) return;

  editAreaList.insertBefore(editAreaList.children[objInd + 1], parentDiv as HTMLElement);
  resetMCE(parentDiv);
  resetMCE(editAreaList.children[objInd]);
  enableSaveButton();
}

/** Return whether a file name has an mp4 extension. */
export function isVideoFile(fileName: string): boolean {
  const fileExtention = fileName.split('.').pop()!.toLowerCase();
  return fileExtention === 'mp4';
}

/** Return whether a file name has a supported image extension. */
export function isImageFile(fileName: string): boolean {
  const fileExtention = fileName.split('.').pop()!.toLowerCase();
  return ['jpg', 'jpeg', 'jfif', 'png'].includes(fileExtention);
}

/** Return whether a file name has a glb extension. */
export function isMeshFile(fileName: string): boolean {
  return fileName.split('.').pop()!.toLowerCase() === 'glb';
}

/** Return the row selector stored on an edit button's name attribute. */
export function nameSelector(element: Element): string {
  return element.getAttribute('name') ?? '';
}

/** Return the row selector from a jQuery event target. */
export function eventNameSelector(e: JQuery.TriggeredEvent): string {
  return nameSelector(e.target as Element);
}
