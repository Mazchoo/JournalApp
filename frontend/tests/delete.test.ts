import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteContent,
  deleteFromDatabase,
  disableDeleteButton,
  enableDeleteButton,
} from "../src/entry/delete";
import { reloadPage } from "../src/runtime/navigation";
import { stubAjax, type AjaxStub } from "./helpers/ajax";
import {
  CSRF_TOKEN,
  installModalStubs,
  renderDayPage,
  type ModalStubs,
} from "./helpers/dom";

vi.mock("../src/runtime/navigation");

let ajax: AjaxStub;
let modals: ModalStubs;

beforeEach(() => {
  vi.mocked(reloadPage).mockClear();
  renderDayPage({ rows: ["paragraph"] });
  ajax = stubAjax();
  modals = installModalStubs();
});

describe("delete button state", () => {
  it("enableDeleteButton turns the outline button into a danger button", () => {
    enableDeleteButton();

    const button = document.getElementById("btn-delete")!;
    expect(button.classList.contains("disabled")).toBe(false);
    expect(button.classList.contains("btn-outline-danger")).toBe(false);
    expect(button.classList.contains("btn-danger")).toBe(true);
  });

  it("disableDeleteButton reverses it", () => {
    enableDeleteButton();
    disableDeleteButton();

    const button = document.getElementById("btn-delete")!;
    expect(button.classList.contains("btn-danger")).toBe(false);
    expect(button.classList.contains("disabled")).toBe(true);
    expect(button.classList.contains("btn-outline-danger")).toBe(true);
  });
});

describe("deleteContent", () => {
  it("does nothing while the delete button is disabled", () => {
    deleteContent();

    expect(modals.showCallbackModal).not.toHaveBeenCalled();
  });

  it("asks for confirmation before deleting", () => {
    enableDeleteButton();

    deleteContent();

    expect(modals.showCallbackModal).toHaveBeenCalledWith(
      "Are you sure?",
      "Delete this entry from database?",
      "Delete",
      deleteFromDatabase,
    );
    expect(ajax.calls).toHaveLength(0);
  });

  it("posts the delete only once the modal is confirmed", () => {
    enableDeleteButton();

    deleteContent();
    modals.confirmLast(modals.showCallbackModal);

    expect(ajax.last().url).toBe("/delete-entry/");
  });
});

describe("deleteFromDatabase", () => {
  it("posts the CSRF token and the date slug", () => {
    deleteFromDatabase();

    const settings = ajax.last();
    expect(settings.type).toBe("POST");
    expect(settings.url).toBe("/delete-entry/");
    expect(settings.data).toEqual({
      csrfmiddlewaretoken: CSRF_TOKEN,
      name: "2024-03-15",
    });
  });

  it("reloads the page on success", async () => {
    deleteFromDatabase();
    await ajax.succeed({ success: "Deleted" });

    expect(vi.mocked(reloadPage)).toHaveBeenCalledTimes(1);
  });

  it("shows a modal on a server-reported error without reloading", async () => {
    deleteFromDatabase();
    await ajax.succeed({ error: "Entry is locked" });

    expect(modals.showMessageSimpleModal).toHaveBeenCalledWith("Delete Error", {
      error: "Entry is locked",
    });
    expect(vi.mocked(reloadPage)).not.toHaveBeenCalled();
  });

  it("shows a modal on a transport error", async () => {
    deleteFromDatabase();
    await ajax.fail("Bad Gateway");

    expect(modals.showMessageSimpleModal).toHaveBeenCalledWith(
      "Unknown Error",
      "Bad Gateway",
    );
  });

  it("hides the spinner and re-disables the button once the request settles", async () => {
    enableDeleteButton();
    document.getElementById("spinner-save")!.classList.remove("invisible");

    deleteFromDatabase();
    await ajax.succeed({ error: "nope" });

    expect(
      document.getElementById("spinner-save")!.classList.contains("invisible"),
    ).toBe(true);
    expect(
      document.getElementById("btn-delete")!.classList.contains("disabled"),
    ).toBe(true);
  });
});
