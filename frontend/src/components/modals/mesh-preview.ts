import {
  MESH_CANVAS_FALLBACK_WIDTH_PX,
  meshModalRevealStyle,
} from "../../display-config";
import { PageElement } from "../page-element";

/** Full-size 3D canvas shown in the mesh modal (`#mesh-preview`). */
export class MeshPreview extends PageElement<HTMLCanvasElement> {
  constructor() {
    super("mesh-preview");
  }

  /** Return the modal canvas, logging if it is missing. */
  canvas(): HTMLCanvasElement | null {
    return this.resolve();
  }

  /** Size the modal canvas to the given aspect ratio. */
  fitToAspect(aspectRatio: number): void {
    const canvas = this.resolve();
    if (canvas === null) return;
    const width = canvas.clientWidth || MESH_CANVAS_FALLBACK_WIDTH_PX;
    Object.assign(canvas.style, meshModalRevealStyle(aspectRatio, width));
  }

  /** Replace the canvas so the previous WebGL context and listeners are dropped. */
  reset(): void {
    const canvas = this.resolve();
    if (canvas === null) return;
    if (canvas.parentNode === null) {
      console.error(
        `${this.constructor.name}: #${this.elementId} has no parent`,
      );
      return;
    }
    const clone = canvas.cloneNode(true) as HTMLCanvasElement;
    canvas.parentNode.replaceChild(clone, canvas);
    this.node = clone;
  }
}
