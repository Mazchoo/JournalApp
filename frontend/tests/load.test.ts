import { beforeEach, describe, expect, it, vi } from "vitest";

import { PARAGRAPH_EDITOR_HEIGHT_PX } from "../src/display-config";
import {
  initializeServerRenderedContent,
  loadServerRenderedImage,
  loadServerRenderedVideo,
} from "../src/entry/load";
import { stubAjax, type AjaxStub } from "./helpers/ajax";
import { CSRF_TOKEN, renderDayPage } from "./helpers/dom";
import { installFakeTinyMCE, type FakeTinyMCE } from "./helpers/tinymce";

let ajax: AjaxStub;
let tinymce: FakeTinyMCE;

beforeEach(() => {
  renderDayPage({ rows: ["paragraph", "image", "video"] });
  tinymce = installFakeTinyMCE();
  ajax = stubAjax();
});

describe("loadServerRenderedImage", () => {
  it("posts the image id with the CSRF token", () => {
    loadServerRenderedImage("1", "i1");

    const settings = ajax.last();
    expect(settings.type).toBe("POST");
    expect(settings.url).toBe("/get-downsized-image/");
    expect(settings.data).toEqual({
      image_id: "i1",
      csrfmiddlewaretoken: CSRF_TOKEN,
    });
  });

  it("sets the returned base64 on the matching image", async () => {
    loadServerRenderedImage("1", "i1");
    await ajax.succeed({ base64: "data:image/png;base64,THUMB" });

    expect(document.getElementById("image1")!.getAttribute("src")).toBe(
      "data:image/png;base64,THUMB",
    );
  });

  it("logs a server-reported error", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    loadServerRenderedImage("1", "i1");
    await ajax.succeed({ error: "Cache miss" });

    expect(log).toHaveBeenCalledWith("Image load error:", "Cache miss");
    log.mockRestore();
  });

  it("logs a transport error", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    loadServerRenderedImage("1", "i1");
    await ajax.fail("Not Found");

    expect(log).toHaveBeenCalledWith("Failed to load image:", "Not Found");
    log.mockRestore();
  });
});

describe("loadServerRenderedVideo", () => {
  it("posts the video id to the downsized video endpoint", () => {
    loadServerRenderedVideo("2", "v2");

    const settings = ajax.last();
    expect(settings.url).toBe("/get-downsized-video-image/");
    expect(settings.data).toEqual({
      video_id: "v2",
      csrfmiddlewaretoken: CSRF_TOKEN,
    });
  });

  it("sets the returned poster frame on the matching image", async () => {
    loadServerRenderedVideo("2", "v2");
    await ajax.succeed({ base64: "data:image/png;base64,POSTER" });

    expect(document.getElementById("image2")!.getAttribute("src")).toBe(
      "data:image/png;base64,POSTER",
    );
  });

  it("logs a server-reported error", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    loadServerRenderedVideo("2", "v2");
    await ajax.succeed({ error: "No frames" });

    expect(log).toHaveBeenCalledWith("Video image load error:", "No frames");
    log.mockRestore();
  });

  it("logs a transport error", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    loadServerRenderedVideo("2", "v2");
    await ajax.fail("Gone");

    expect(log).toHaveBeenCalledWith("Failed to load video image:", "Gone");
    log.mockRestore();
  });
});

describe("initializeServerRenderedContent", () => {
  it("creates an editor for every server-rendered paragraph", () => {
    initializeServerRenderedContent();

    expect(tinymce.initOptions).toHaveLength(1);
    expect(tinymce.initOptions[0]!["selector"]).toBe("#paragraph0");
  });

  it("shows imported HTML instead of TinyMCE when the textarea is marked imported", () => {
    const textarea = document.getElementById(
      "paragraph0",
    ) as HTMLTextAreaElement;
    textarea.value = "<!DOCTYPE html><html><body>Saved</body></html>";
    textarea.setAttribute("data-imported-html", "1");

    initializeServerRenderedContent();

    expect(tinymce.initOptions).toHaveLength(0);
    expect(document.querySelector(".imported-html-editor")).not.toBeNull();
    expect(
      document.querySelector<HTMLIFrameElement>(".imported-html-frame")!.srcdoc,
    ).toBe("<!DOCTYPE html><html><body>Saved</body></html>");
  });

  it("uses the height and synthesis flag from the textarea data attributes", () => {
    const textarea = document.getElementById("paragraph0")!;
    textarea.setAttribute("data-height", "512");
    textarea.setAttribute("data-allow-ai-synthesis", "0");

    initializeServerRenderedContent();

    expect(tinymce.initOptions[0]!["height"]).toBe(512);
  });

  it("falls back to the configured editor height for an unparsable data-height", () => {
    document.getElementById("paragraph0")!.setAttribute("data-height", "None");

    initializeServerRenderedContent();

    expect(tinymce.initOptions[0]!["height"]).toBe(PARAGRAPH_EDITOR_HEIGHT_PX);
  });

  it("kicks off a downsized request for each image and video row", () => {
    initializeServerRenderedContent();

    expect(ajax.calls.map((settings) => settings.url)).toEqual([
      "/get-downsized-image/",
      "/get-downsized-video-image/",
    ]);
  });

  it("wires the edit buttons of the media rows", () => {
    initializeServerRenderedContent();

    document.getElementById("allow-syn1")!.click();

    expect(
      document.getElementById("allow-syn1")!.classList.contains("btn-primary"),
    ).toBe(true);
  });

  it("scrolls back to the top of the page", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    initializeServerRenderedContent();

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scrollTo.mockRestore();
  });

  it("skips media rows that carry no id", () => {
    document.getElementById("image1")!.removeAttribute("data-image-id");
    document.getElementById("image2")!.removeAttribute("data-video-id");

    initializeServerRenderedContent();

    expect(ajax.calls).toHaveLength(0);
  });

  it("does nothing on a page with no content rows", () => {
    renderDayPage({ rows: [] });
    tinymce = installFakeTinyMCE();
    ajax = stubAjax();

    initializeServerRenderedContent();

    expect(tinymce.initOptions).toHaveLength(0);
    expect(ajax.calls).toHaveLength(0);
  });
});
