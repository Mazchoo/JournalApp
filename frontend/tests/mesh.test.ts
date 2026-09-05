import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import {
  MESH_CANVAS_FALLBACK_WIDTH_PX,
  MESH_CANVAS_HEIGHT_PX,
  MESH_CANVAS_REVEAL_STYLE,
  MESH_FRAME_JPEG_QUALITY,
} from "../src/display-config";
import {
  computeNormals,
  currentFrameAsJpegBase64,
  initializeMeshRenderer,
  renderGLB,
} from "../src/entry/media/mesh";
import {
  buildGlb,
  buildTexturedTriangleGlb,
  buildTriangleGlb,
  prepareCanvas,
} from "./helpers/glb";

let canvas: HTMLCanvasElement;
let consoleError: MockInstance<typeof console.error>;

/** Wait until `console.error` is called with the given message. */
function waitForConsoleError(message: string): Promise<void> {
  return vi.waitFor(() => {
    const seen = consoleError.mock.calls.some((call) => call[0] === message);
    expect(seen, `console.error was never called with "${message}"`).toBe(true);
  });
}

beforeEach(() => {
  document.body.innerHTML = '<canvas id="mesh-canvas0"></canvas>';
  canvas = document.getElementById("mesh-canvas0") as HTMLCanvasElement;
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("computeNormals", () => {
  it("produces the unit face normal of an indexed triangle", () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);

    const normals = computeNormals(positions, new Uint16Array([0, 1, 2]));

    expect(Array.from(normals)).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  });

  it("handles non-indexed geometry by walking vertices in threes", () => {
    const positions = new Float32Array([0, 0, 0, 0, 0, 1, 0, 1, 0]);

    const normals = computeNormals(positions, null);

    expect(normals).toHaveLength(9);
    expect(normals[0]).toBeCloseTo(-1);
    expect(normals[1]).toBeCloseTo(0);
    expect(normals[2]).toBeCloseTo(0);
  });

  it("averages and normalises the normals of shared vertices", () => {
    // Two triangles sharing the edge 1-2, folded around the x axis.
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const normals = computeNormals(positions, indices);

    for (let i = 0; i < normals.length; i += 3) {
      const length = Math.hypot(normals[i]!, normals[i + 1]!, normals[i + 2]!);
      expect(length).toBeCloseTo(1);
    }
  });

  it("leaves degenerate triangles at zero rather than dividing by zero", () => {
    const positions = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]);

    const normals = computeNormals(positions, new Uint16Array([0, 1, 2]));

    expect(Array.from(normals)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("renderGLB", () => {
  it("rejects a file that does not start with the glTF magic number", () => {
    const notGlb = new ArrayBuffer(64);

    renderGLB(canvas, notGlb);

    expect(consoleError).toHaveBeenCalledWith("Not a valid GLB file");
  });

  it("rejects a GLB with no meshes", () => {
    const buffer = buildGlb({ accessors: [], bufferViews: [], meshes: [] });

    renderGLB(canvas, buffer);

    expect(consoleError).toHaveBeenCalledWith("No meshes found in GLB");
  });

  it("reports a missing WebGL context", () => {
    vi.spyOn(canvas, "getContext").mockReturnValue(null);

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(consoleError).toHaveBeenCalledWith("WebGL not supported");
  });

  it("sizes and reveals the canvas before drawing", () => {
    prepareCanvas(canvas);

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(canvas.style.visibility).toBe(MESH_CANVAS_REVEAL_STYLE.visibility);
    expect(canvas.style.height).toBe(MESH_CANVAS_REVEAL_STYLE.height);
    expect(canvas.style.display).toBe(MESH_CANVAS_REVEAL_STYLE.display);
    expect(canvas.width).toBe(MESH_CANVAS_FALLBACK_WIDTH_PX);
    expect(canvas.height).toBe(MESH_CANVAS_HEIGHT_PX);
    expect(canvas.getContext).toHaveBeenCalledWith("webgl", {
      preserveDrawingBuffer: true,
    });
  });

  it("uploads the geometry and draws the indexed triangle", () => {
    const gl = prepareCanvas(canvas);
    const { indices } = buildTriangleGlb();

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(gl.callsTo("drawElements")).toHaveLength(1);
    expect(gl.callsTo("drawElements")[0]![1]).toBe(indices.length);
    expect(gl.callsTo("drawArrays")).toHaveLength(0);
  });

  it("uploads a position buffer and a computed normal buffer", () => {
    const gl = prepareCanvas(canvas);

    renderGLB(canvas, buildTriangleGlb().buffer);

    const uploads = gl.callsTo("bufferData").map((args) => args[1]);
    const floatUploads = uploads.filter((data) => data instanceof Float32Array);
    expect(floatUploads).toHaveLength(2);
    expect((floatUploads[1] as Float32Array).length).toBe(9);
  });

  it("applies the default base colour when the primitive has no material", () => {
    const gl = prepareCanvas(canvas);

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(gl.callsTo("uniform4fv")[0]![1]).toEqual([0.8, 0.8, 0.8, 1.0]);
  });

  it("applies the material base colour when one is present", () => {
    const gl = prepareCanvas(canvas);
    const { buffer } = buildTriangleGlb();
    const withMaterial = replaceGltf(buffer, (gltf) => {
      gltf["materials"] = [
        { pbrMetallicRoughness: { baseColorFactor: [0.1, 0.2, 0.3, 1] } },
      ];
      (
        gltf["meshes"] as { primitives: Record<string, unknown>[] }[]
      )[0]!.primitives[0]!["material"] = 0;
      return gltf;
    });

    renderGLB(canvas, withMaterial);

    expect(gl.callsTo("uniform4fv")[0]![1]).toEqual([0.1, 0.2, 0.3, 1]);
  });

  it("reports its first frame through the completion callback exactly once", () => {
    prepareCanvas(canvas);
    const onComplete = vi.fn();

    renderGLB(canvas, buildTriangleGlb().buffer, onComplete);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("aborts when the shader program fails to link", () => {
    const gl = prepareCanvas(canvas);
    gl.overrides["getProgramParameter"] = () => false;

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(consoleError).toHaveBeenCalledWith("Program link error:", "");
    expect(gl.callsTo("drawElements")).toHaveLength(0);
  });

  it("redraws after an embedded texture decodes so the first view is not black", () => {
    const gl = prepareCanvas(canvas);
    let fireLoad: (() => void) | null = null;
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:test",
      revokeObjectURL: () => {},
    });
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        set src(_url: string) {
          fireLoad = () => {
            this.onload?.();
          };
        }
      },
    );

    renderGLB(canvas, buildTexturedTriangleGlb());
    expect(gl.callsTo("drawElements")).toHaveLength(1);

    fireLoad!();
    expect(gl.callsTo("drawElements")).toHaveLength(2);
  });

  it("presents the first frame on animation frame instead of a spin loop", () => {
    const gl = prepareCanvas(canvas);
    const raf = vi.mocked(window.requestAnimationFrame);

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(gl.callsTo("drawElements")).toHaveLength(1);
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it("zooms toward the cursor on wheel and redraws", () => {
    const gl = prepareCanvas(canvas);
    renderGLB(canvas, buildTriangleGlb().buffer);
    const before = gl.callsTo("uniformMatrix4fv")[0]![2];

    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -120,
        clientX: 600,
        clientY: 100,
        cancelable: true,
      }),
    );

    expect(gl.callsTo("drawElements")).toHaveLength(2);
    expect(gl.callsTo("uniformMatrix4fv")[1]![2]).not.toEqual(before);
  });

  it("orbits around the mesh when the middle mouse button is dragged", () => {
    const gl = prepareCanvas(canvas);
    renderGLB(canvas, buildTriangleGlb().buffer);
    const before = gl.callsTo("uniformMatrix4fv")[0]![2];

    canvas.dispatchEvent(
      new MouseEvent("mousedown", { button: 1, clientX: 100, clientY: 100 }),
    );
    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 160, clientY: 130 }),
    );

    expect(gl.callsTo("drawElements")).toHaveLength(2);
    expect(gl.callsTo("uniformMatrix4fv")[1]![2]).not.toEqual(before);
  });

  it("pans with WASD only while the canvas is focused", () => {
    const gl = prepareCanvas(canvas);
    renderGLB(canvas, buildTriangleGlb().buffer);
    const initial = gl.callsTo("uniformMatrix4fv")[0]![2];

    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    expect(gl.callsTo("drawElements")).toHaveLength(1);
    expect(gl.callsTo("uniformMatrix4fv")[0]![2]).toEqual(initial);

    canvas.focus();
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    expect(gl.callsTo("drawElements")).toHaveLength(2);
    expect(gl.callsTo("uniformMatrix4fv")[1]![2]).not.toEqual(initial);
  });

  it("rolls with Q and E only while the canvas is focused", () => {
    const gl = prepareCanvas(canvas);
    renderGLB(canvas, buildTriangleGlb().buffer);
    const initial = gl.callsTo("uniformMatrix4fv")[0]![2];

    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
    expect(gl.callsTo("drawElements")).toHaveLength(1);
    expect(gl.callsTo("uniformMatrix4fv")[0]![2]).toEqual(initial);

    canvas.focus();
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
    expect(gl.callsTo("drawElements")).toHaveLength(2);
    expect(gl.callsTo("uniformMatrix4fv")[1]![2]).not.toEqual(initial);
  });
});

describe("currentFrameAsJpegBase64", () => {
  it("returns a JPEG data URL of the canvas", async () => {
    const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], {
      type: "image/jpeg",
    });
    vi.spyOn(canvas, "toBlob").mockImplementation((cb, type, quality) => {
      expect(type).toBe("image/jpeg");
      expect(quality).toBe(MESH_FRAME_JPEG_QUALITY);
      cb(jpeg);
    });

    const result = await currentFrameAsJpegBase64(canvas);

    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("returns null when the canvas cannot encode a JPEG", async () => {
    vi.spyOn(canvas, "toBlob").mockImplementation((cb) => {
      cb(null);
    });

    const result = await currentFrameAsJpegBase64(canvas);

    expect(result).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "MediaEntry: canvas JPEG encode failed",
    );
  });
});

describe("initializeMeshRenderer", () => {
  it("reads the file and renders it", async () => {
    prepareCanvas(canvas);
    const onComplete = vi.fn();
    const file = new File([buildTriangleGlb().buffer], "scan.glb");

    initializeMeshRenderer(canvas, file, onComplete);
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));

    expect(canvas.width).toBe(MESH_CANVAS_FALLBACK_WIDTH_PX);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("reports a parse failure and still signals completion", async () => {
    const onComplete = vi.fn();
    const truncated = new Uint8Array([0x67, 0x6c, 0x54, 0x46]);

    initializeMeshRenderer(
      canvas,
      new File([truncated], "scan.glb"),
      onComplete,
    );
    await waitForConsoleError("GLB render error:");

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not require a completion callback", async () => {
    const truncated = new Uint8Array([0x67, 0x6c, 0x54, 0x46]);

    initializeMeshRenderer(canvas, new File([truncated], "scan.glb"));
    await waitForConsoleError("GLB render error:");
  });
});

/** Rewrite the JSON chunk of a GLB while keeping its binary chunk intact. */
function replaceGltf(
  buffer: ArrayBuffer,
  edit: (gltf: Record<string, unknown>) => Record<string, unknown>,
): ArrayBuffer {
  const view = new DataView(buffer);
  const jsonLen = view.getUint32(12, true);
  const gltf = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLen)),
  ) as Record<string, unknown>;
  const binChunkStart = 20 + jsonLen;
  const binLen = view.getUint32(binChunkStart, true);
  const bin = new Uint8Array(
    buffer.slice(binChunkStart + 8, binChunkStart + 8 + binLen),
  );

  return buildGlb(edit(gltf), bin);
}
