import { describe, expect, it } from "vitest";

import {
  isHtmlFile,
  isImageFile,
  isMeshFile,
  isVideoFile,
} from "../src/common/file-io";

describe("media type detection", () => {
  it.each(["clip.mp4", "CLIP.MP4"])("treats %s as a video", (name) => {
    expect(isVideoFile(name)).toBe(true);
    expect(isImageFile(name)).toBe(false);
    expect(isMeshFile(name)).toBe(false);
  });

  it.each(["a.jpg", "a.jpeg", "a.jfif", "a.PNG"])(
    "treats %s as an image",
    (name) => {
      expect(isImageFile(name)).toBe(true);
      expect(isVideoFile(name)).toBe(false);
      expect(isMeshFile(name)).toBe(false);
    },
  );

  it.each(["scan.glb", "scan.GLB"])("treats %s as a mesh", (name) => {
    expect(isMeshFile(name)).toBe(true);
    expect(isImageFile(name)).toBe(false);
  });

  it.each(["notes.txt", "archive.zip", "noextension"])(
    "treats %s as unknown",
    (name) => {
      expect(isImageFile(name)).toBe(false);
      expect(isVideoFile(name)).toBe(false);
      expect(isMeshFile(name)).toBe(false);
      expect(isHtmlFile(name)).toBe(false);
    },
  );

  it.each(["page.html", "PAGE.HTM", "notes.HTML"])(
    "treats %s as HTML",
    (name) => {
      expect(isHtmlFile(name)).toBe(true);
      expect(isImageFile(name)).toBe(false);
    },
  );
});
