import { enableSaveButton } from '../entry/save';
import { resetMCE } from '../tinymce/helper';
import { bs, jq } from '../runtime/externals';

/** Port of static/JS/common.utility.js. */

export function reverseString(str: string): string {
  return str.split('').reverse().join('');
}

export function getIndexInArr<T>(arr: ArrayLike<T>, obj: T): number | undefined {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === obj) return i;
  }
  return undefined;
}

export function deleteParentDiv(obj: Element | null | undefined): void {
  if (obj == null || obj.parentNode == null || obj.parentNode.parentNode == null) return;
  obj.parentNode.parentNode.removeChild(obj.parentNode);
}

export function removeItem(obj: Element | null | undefined): void {
  if (obj == null || obj.parentNode == null) return;
  obj.parentNode.removeChild(obj);
}

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

export function changeTooltipTextFromInput(e: Event, idTag: string, suffix: string): void {
  const input = e.target as HTMLInputElement;
  jq()(idTag)[0].innerHTML = input.value + suffix;
}

export function reorderOneDivFromAnother(sourceTag: string, targetTag: string): void {
  const $ = jq();
  const targetDiv = $(targetTag)[0];
  const sourceObjs = $(sourceTag);

  for (let i = 0; i < sourceObjs.length; i++) {
    const targetItem = $(nameSelector(sourceObjs[i]))[0];
    targetDiv.appendChild(targetItem);
  }
}

export function refreshScrollSpies(): void {
  const dataSpyList = Array.from(document.querySelectorAll('[data-bs-spy="scroll"]'));
  dataSpyList.forEach((dataSpyEl) => {
    bs().ScrollSpy.getInstance(dataSpyEl)!.refresh();
  });
}

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

export function getContentType(key: string): string {
  const contentMatch = key.match(/([a-zA-Z]+)/g);
  if (contentMatch === null) return '';
  return contentMatch[0];
}

export function getContentId(key: string): string | -1 {
  const contentMatch = key.match(/([0-9]+)/g);
  if (contentMatch === null) return -1;
  return contentMatch[0];
}

export function getParentDivOfObject(e: JQuery.TriggeredEvent): HTMLElement | undefined {
  const parentDiv = jq()(eventNameSelector(e))[0];
  if (parentDiv === undefined) return undefined;
  return parentDiv.parentNode as HTMLElement;
}

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

export function isVideoFile(fileName: string): boolean {
  const fileExtention = fileName.split('.').pop()!.toLowerCase();
  return fileExtention === 'mp4';
}

export function isImageFile(fileName: string): boolean {
  const fileExtention = fileName.split('.').pop()!.toLowerCase();
  return ['jpg', 'jpeg', 'jfif', 'png'].includes(fileExtention);
}

export function isMeshFile(fileName: string): boolean {
  return fileName.split('.').pop()!.toLowerCase() === 'glb';
}

/**
 * The edit buttons rendered by templates/EntryContents/*.html carry the selector for their
 * own entry row in their `name` attribute, e.g. `name=".entry-region-3"`.
 */
export function nameSelector(element: Element): string {
  return element.getAttribute('name') ?? '';
}

export function eventNameSelector(e: JQuery.TriggeredEvent): string {
  return nameSelector(e.target as Element);
}
