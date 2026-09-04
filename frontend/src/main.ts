import * as journal from "./index";
import { boot } from "./boot";

/**
 * Bundle entry point.
 *
 * The IIFE still publishes the public API on `window` so pages like test_mesh.html
 * can call `initializeMeshRenderer` by name. Page wiring (day editor, carousel,
 * modals) runs here; templates no longer contain jQuery or inline handlers.
 */
Object.assign(window, journal);
boot();
