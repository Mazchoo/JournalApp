import { editArea } from './globals';
import { bs } from '../runtime/externals';

/** Read the CSRF token Django renders via `{% csrf_token %}`. */
export function csrfToken(): string {
  const input = document.querySelector<HTMLInputElement>('[name=csrfmiddlewaretoken]');
  return input!.value;
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
  const tooltip = document.querySelector(idTag);
  if (tooltip !== null) tooltip.innerHTML = input.value + suffix;
}

/** Move named children from one container into another. */
export function reorderOneDivFromAnother(sourceTag: string, targetTag: string): void {
  const targetDiv = document.querySelector(targetTag);
  if (targetDiv === null) return;
  const sourceObjs = document.querySelectorAll(sourceTag);

  for (let i = 0; i < sourceObjs.length; i++) {
    const targetItem = document.querySelector(nameSelector(sourceObjs[i]!));
    if (targetItem !== null) targetDiv.appendChild(targetItem);
  }
}

/** Refresh every Bootstrap scroll spy on the page. */
export function refreshScrollSpies(): void {
  const dataSpyList = Array.from(document.querySelectorAll('[data-bs-spy="scroll"]'));
  dataSpyList.forEach((dataSpyEl) => {
    bs().ScrollSpy.getInstance(dataSpyEl)!.refresh();
  });
}

/** Insert a content row above the clicked row. */
export function insertNewObjectIntoEditArea(
  e: Event,
  div: HTMLElement,
): HTMLElement | undefined {
  const parentDiv = getParentDivOfObject(e);
  if (parentDiv === undefined) return undefined;
  if (!editArea.insertBefore(div, parentDiv)) return undefined;
  return div;
}

/** Return the parent row of the clicked edit button. */
export function getParentDivOfObject(e: Event): HTMLElement | undefined {
  const parentDiv = document.querySelector(eventNameSelector(e));
  if (parentDiv === null) return undefined;
  return parentDiv.parentNode as HTMLElement;
}

/** Scroll the window to the top of the page. */
export function scrollToTop(): void {
  window.scrollTo(0, 0);
}

/** Scroll the window to the bottom of the page. */
export function scrollToBottom(): void {
  window.scrollTo(0, document.body.scrollHeight);
}

/** Return the row selector stored on an edit button's name attribute. */
export function nameSelector(element: Element): string {
  return element.getAttribute('name') ?? '';
}

/** Return the row selector from an event target. */
export function eventNameSelector(e: Event): string {
  return nameSelector(e.target as Element);
}
