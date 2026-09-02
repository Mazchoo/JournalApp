import { getParentDivOfObject } from '../components/common';
import { editArea } from '../components/globals';
import { enableSaveButton } from '../entry/save';
import { resetMCE } from '../tinymce/helper';

export {
  changeTooltipTextFromInput,
  componentFromTemplate,
  deleteParentDiv,
  getParentDivOfObject,
  insertNewObjectIntoEditArea,
  refreshScrollSpies,
  removeItem,
  reorderOneDivFromAnother,
} from '../components/common';

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

/** Extract the leading alphabetic type from an element id. */
export function getContentType(key: string): string {
  const contentMatch = key.match(/([a-zA-Z]+)/g);
  if (contentMatch === null) return '';
  return contentMatch[0]!;
}

/** Move a content row one position earlier in the edit area. */
export function moveObjectUp(e: Event): void {
  const parentDiv = getParentDivOfObject(e);
  const children = editArea.children();
  if (children === null || parentDiv === undefined) return;
  const objInd = getIndexInArr(children, parentDiv as Element);

  if (objInd === undefined || objInd === 0) return;

  editArea.insertBefore(parentDiv as HTMLElement, children[objInd - 1]!);
  resetMCE(parentDiv);
  resetMCE(children[objInd]);
  enableSaveButton();
}

/** Move a content row one position later in the edit area. */
export function moveObjectDown(e: Event): void {
  const parentDiv = getParentDivOfObject(e);
  const children = editArea.children();
  if (children === null || parentDiv === undefined) return;
  const objInd = getIndexInArr(children, parentDiv as Element);

  if (objInd === undefined || objInd === children.length - 1) return;

  editArea.insertBefore(children[objInd + 1]!, parentDiv as HTMLElement);
  resetMCE(parentDiv);
  resetMCE(children[objInd]);
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
