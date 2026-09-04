import { describe, expect, it } from "vitest";

import { encodeNestedForm } from "../src/entry/make-request";

describe("encodeNestedForm", () => {
  it("encodes nested objects as Django-style bracket keys", () => {
    const body = encodeNestedForm({
      name: "2024-03-15",
      content: {
        paragraph0: { text: "hello", height: 220, allow_ai_synthesis: 1 },
      },
    });
    const params = new URLSearchParams(body);

    expect(params.get("name")).toBe("2024-03-15");
    expect(params.get("content[paragraph0][text]")).toBe("hello");
    expect(params.get("content[paragraph0][height]")).toBe("220");
    expect(params.get("content[paragraph0][allow_ai_synthesis]")).toBe("1");
  });

  it("omits nullish values and empty objects", () => {
    const body = encodeNestedForm({
      name: "x",
      content: undefined,
      extra: null,
      empty: {},
    });
    const params = new URLSearchParams(body);

    expect(params.get("name")).toBe("x");
    expect(params.has("content")).toBe(false);
    expect(params.has("extra")).toBe(false);
    expect([...params.keys()].some((key) => key.startsWith("empty"))).toBe(
      false,
    );
  });
});
