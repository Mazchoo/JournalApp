import { describe, expect, it } from "vitest";

import {
  paragraphIndex,
  type SynthesisEditor,
} from "../src/runtime/synthesis-editor";

/** Minimal editor stand-in for id parsing. */
function editorWithId(id: string): SynthesisEditor {
  return { id } as unknown as SynthesisEditor;
}

describe("paragraphIndex", () => {
  it("strips the paragraph prefix from the editor id", () => {
    expect(paragraphIndex(editorWithId("paragraph0"))).toBe("0");
    expect(paragraphIndex(editorWithId("paragraph12"))).toBe("12");
  });
});
