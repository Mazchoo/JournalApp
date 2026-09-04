/**
 * Cache one document node by id. Methods re-query if the node was replaced
 * (as tests do between cases) and log when the element is not on the page.
 */
export class PageElement<T extends HTMLElement = HTMLElement> {
  protected node: T | null = null;

  constructor(readonly elementId: string) {}

  /** Query the document and store the matching element. */
  bind(): void {
    this.node = document.getElementById(this.elementId) as T | null;
  }

  /** Whether the element is currently in the document. Does not log. */
  exists(): boolean {
    if (this.node === null || !this.node.isConnected) {
      this.bind();
    }
    return this.node !== null;
  }

  /**
   * Return the cached element, re-querying if it was detached.
   * Logs and returns null when the element is missing.
   */
  protected resolve(): T | null {
    if (this.node === null || !this.node.isConnected) {
      this.bind();
    }
    if (this.node === null) {
      console.error(
        `${this.constructor.name}: #${this.elementId} does not exist`,
      );
    }
    return this.node;
  }

  /** Bind a click listener if the element exists. */
  onClick(handler: (event: Event) => void): void {
    this.resolve()?.addEventListener("click", handler);
  }
}
