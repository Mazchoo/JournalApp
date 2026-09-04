import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  changeTooltipTextFromInput,
  componentFromTemplate,
  deleteParentDiv,
  getContentType,
  getIndexInArr,
  getParentDivOfObject,
  insertNewObjectIntoEditArea,
  moveObjectDown,
  moveObjectUp,
  refreshScrollSpies,
  removeItem,
  reorderOneDivFromAnother,
  reverseString,
} from "../src/common/dom";
import { installFakeTinyMCE, seedEditor } from "./helpers/tinymce";
import { renderDayPage } from "./helpers/dom";

/** Build a click event whose target is the element matching the selector. */
function clickEventOn(selector: string): Event {
  const target = document.querySelector(selector);
  if (target === null) throw new Error(`No element matched ${selector}`);
  return { target } as unknown as Event;
}

describe("reverseString", () => {
  it("reverses the characters", () => {
    expect(reverseString("journal")).toBe("lanruoj");
  });

  it("returns an empty string unchanged", () => {
    expect(reverseString("")).toBe("");
  });
});

describe("getIndexInArr", () => {
  it("finds the index of an identical member", () => {
    const a = { id: "a" };
    const b = { id: "b" };
    expect(getIndexInArr([a, b], b)).toBe(1);
  });

  it("returns undefined when the member is absent", () => {
    expect(getIndexInArr([{ id: "a" }], { id: "a" })).toBeUndefined();
  });

  it("works on live HTMLCollections", () => {
    document.body.innerHTML = '<ul><li id="one"></li><li id="two"></li></ul>';
    const list = document.querySelector("ul")!;
    expect(getIndexInArr(list.children, document.getElementById("two")!)).toBe(
      1,
    );
  });
});

describe("deleteParentDiv", () => {
  it("drops the whole entry row when handed an entry-region div", () => {
    renderDayPage({ rows: ["paragraph", "paragraph"] });
    const entryRegion = document.querySelector(".entry-region-0");

    deleteParentDiv(entryRegion);

    const editArea = document.getElementById("edit-area")!;
    expect(editArea.children).toHaveLength(1);
    expect(editArea.querySelector("#paragraph0")).toBeNull();
    expect(editArea.querySelector("#paragraph1")).not.toBeNull();
  });

  it("is a no-op for a missing element", () => {
    document.body.innerHTML = '<div id="edit-area"></div>';
    expect(() => deleteParentDiv(undefined)).not.toThrow();
    expect(document.getElementById("edit-area")).not.toBeNull();
  });

  it("is a no-op for a detached element", () => {
    expect(() => deleteParentDiv(document.createElement("div"))).not.toThrow();
  });
});

describe("removeItem", () => {
  it("removes only the element itself", () => {
    document.body.innerHTML = '<div id="parent"><span id="child"></span></div>';
    removeItem(document.getElementById("child"));

    expect(document.getElementById("child")).toBeNull();
    expect(document.getElementById("parent")).not.toBeNull();
  });

  it("is a no-op for a missing element", () => {
    expect(() => removeItem(null)).not.toThrow();
  });
});

describe("componentFromTemplate", () => {
  it("wraps the markup in the requested element type", () => {
    const component = componentFromTemplate("<p>hello</p>", "section");
    expect(component.tagName).toBe("SECTION");
    expect(component.innerHTML).toBe("<p>hello</p>");
    expect(component.className).toBe("");
  });

  it("applies the class name when one is given", () => {
    const component = componentFromTemplate(
      "<p></p>",
      "div",
      "row mt-3 paragraph-entry",
    );
    expect(component.className).toBe("row mt-3 paragraph-entry");
  });
});

describe("changeTooltipTextFromInput", () => {
  it("writes the input value plus a suffix into the tooltip", () => {
    document.body.innerHTML =
      '<span id="tip"></span><input id="src" value="42">';
    const input = document.getElementById("src") as HTMLInputElement;

    changeTooltipTextFromInput(
      { target: input } as unknown as Event,
      "#tip",
      "px",
    );

    expect(document.getElementById("tip")!.innerHTML).toBe("42px");
  });
});

describe("reorderOneDivFromAnother", () => {
  it("moves the elements named by the sources into the target, in source order", () => {
    document.body.innerHTML = `
      <div id="target"></div>
      <div id="pool">
        <div id="first"></div>
        <div id="second"></div>
      </div>
      <span class="src" name="#second"></span>
      <span class="src" name="#first"></span>`;

    reorderOneDivFromAnother(".src", "#target");

    const target = document.getElementById("target")!;
    expect(Array.from(target.children).map((child) => child.id)).toEqual([
      "second",
      "first",
    ]);
  });
});

describe("refreshScrollSpies", () => {
  it("refreshes every Bootstrap 5 scrollspy on the page", () => {
    document.body.innerHTML =
      '<div data-bs-spy="scroll"></div><div data-bs-spy="scroll"></div>';
    const refresh = vi.fn();
    window.bootstrap = { ScrollSpy: { getInstance: () => ({ refresh }) } };

    refreshScrollSpies();

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("does nothing on the Bootstrap 4 markup the templates actually render", () => {
    document.body.innerHTML = '<div data-spy="scroll"></div>';
    window.bootstrap = undefined;

    expect(() => refreshScrollSpies()).not.toThrow();
  });
});

describe("getContentType", () => {
  it.each([
    ["paragraph12", "paragraph"],
    ["image3", "image"],
    ["video", "video"],
  ])("reads the letters out of %s", (key, expected) => {
    expect(getContentType(key)).toBe(expected);
  });

  it("returns an empty string when there are no letters", () => {
    expect(getContentType("123")).toBe("");
  });
});

describe("getParentDivOfObject", () => {
  beforeEach(() => {
    renderDayPage({ rows: ["paragraph"] });
  });

  it("resolves the entry row from the button name attribute", () => {
    const parentDiv = getParentDivOfObject(clickEventOn("#delete-content0"));

    expect(parentDiv).not.toBeUndefined();
    expect(parentDiv!.className).toContain("paragraph-entry");
  });

  it("returns undefined when the name attribute matches nothing", () => {
    const orphan = document.createElement("button");
    orphan.setAttribute("name", ".entry-region-99");

    expect(
      getParentDivOfObject({ target: orphan } as unknown as Event),
    ).toBeUndefined();
  });
});

describe("insertNewObjectIntoEditArea", () => {
  beforeEach(() => {
    renderDayPage({ rows: ["paragraph", "paragraph"] });
  });

  it("inserts the element before the row the event came from", () => {
    const div = document.createElement("div");
    div.id = "inserted";

    const result = insertNewObjectIntoEditArea(
      clickEventOn("#insert-paragraph1"),
      div,
    );

    const editArea = document.getElementById("edit-area")!;
    expect(result).toBe(div);
    expect(editArea.children[1]).toBe(div);
  });

  it("does not insert when the event target names no row", () => {
    const div = document.createElement("div");
    const orphan = document.createElement("button");
    orphan.setAttribute("name", ".entry-region-99");

    const result = insertNewObjectIntoEditArea(
      { target: orphan } as unknown as Event,
      div,
    );

    expect(result).toBeUndefined();
    expect(div.parentNode).toBeNull();
    expect(document.getElementById("edit-area")!.children).toHaveLength(2);
  });
});

describe("moveObjectUp / moveObjectDown", () => {
  /** Return the name of each row currently in the edit area. */
  function rowIds(): string[] {
    return Array.from(document.getElementById("edit-area")!.children).map(
      (row) => row.children[0].getAttribute("name") ?? row.className,
    );
  }

  beforeEach(() => {
    renderDayPage({ rows: ["paragraph", "paragraph", "paragraph"] });
    const tinymce = installFakeTinyMCE();
    seedEditor(tinymce, "paragraph0");
    seedEditor(tinymce, "paragraph1");
    seedEditor(tinymce, "paragraph2");
  });

  it("swaps a row with the one above it", () => {
    moveObjectUp(clickEventOn("#move-content-up1"));

    expect(rowIds()).toEqual(["paragraph1", "paragraph0", "paragraph2"]);
  });

  it("leaves the first row where it is", () => {
    moveObjectUp(clickEventOn("#move-content-up0"));

    expect(rowIds()).toEqual(["paragraph0", "paragraph1", "paragraph2"]);
  });

  it("swaps a row with the one below it", () => {
    moveObjectDown(clickEventOn("#move-content-down1"));

    expect(rowIds()).toEqual(["paragraph0", "paragraph2", "paragraph1"]);
  });

  it("leaves the last row where it is", () => {
    moveObjectDown(clickEventOn("#move-content-down2"));

    expect(rowIds()).toEqual(["paragraph0", "paragraph1", "paragraph2"]);
  });

  it("enables the save button after a successful move", () => {
    moveObjectUp(clickEventOn("#move-content-up1"));

    expect(
      document.getElementById("btn-save")!.classList.contains("btn-success"),
    ).toBe(true);
  });

  it("does not enable the save button when the move is rejected", () => {
    moveObjectUp(clickEventOn("#move-content-up0"));

    expect(
      document.getElementById("btn-save")!.classList.contains("disabled"),
    ).toBe(true);
  });

  it("rebuilds the editors of both affected rows", () => {
    const tinymce = window.tinymce as unknown as ReturnType<
      typeof installFakeTinyMCE
    >;
    const before = tinymce.initOptions.length;

    moveObjectUp(clickEventOn("#move-content-up1"));

    expect(tinymce.initOptions.length - before).toBe(2);
  });
});
