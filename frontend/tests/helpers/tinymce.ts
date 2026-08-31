import type { RawEditorOptions, TinyMCE } from 'tinymce';
import type { SynthesisEditor } from '../../src/runtime/externals';

/**
 * A stand-in for the TinyMCE global. Only the handful of APIs the ported code touches are
 * implemented; everything runs synchronously so tests do not have to wait for editor init.
 */

export interface FakeToggleButtonApi {
  active: boolean;
  setActive(state: boolean): void;
}

export interface FakeToggleButtonSpec {
  text?: string;
  tooltip?: string;
  onAction(api: FakeToggleButtonApi): void;
  onSetup(api: FakeToggleButtonApi): () => void;
}

export interface FakeButtonSpec {
  text?: string;
  onAction(): void;
}

export interface FakeEditor {
  id: string;
  content: string;
  containerHeight: number;
  removed: boolean;
  synthesisEnabled?: boolean;
  buttons: Record<string, FakeButtonSpec>;
  toggleButtons: Record<string, FakeToggleButtonSpec>;
  handlers: Record<string, (() => void)[]>;
  getContent(): string;
  setContent(value: string): void;
  getContainer(): { clientHeight: number };
  remove(): void;
  on(name: string, handler: () => void): void;
  fire(name: string): void;
  ui: { registry: { addButton: unknown; addToggleButton: unknown } };
}

export interface FakeTinyMCE {
  editors: Map<string, FakeEditor>;
  initOptions: RawEditorOptions[];
  get(id: string): FakeEditor | null;
  init(options: RawEditorOptions): void;
}

const DEFAULT_CONTAINER_HEIGHT = 300;

function createEditor(owner: FakeTinyMCE, id: string): FakeEditor {
  const editor: FakeEditor = {
    id,
    content: '',
    containerHeight: DEFAULT_CONTAINER_HEIGHT,
    removed: false,
    buttons: {},
    toggleButtons: {},
    handlers: {},
    getContent: () => editor.content,
    setContent: (value: string) => {
      editor.content = value;
    },
    getContainer: () => ({ clientHeight: editor.containerHeight }),
    remove: () => {
      editor.removed = true;
      owner.editors.delete(id);
    },
    on: (name: string, handler: () => void) => {
      (editor.handlers[name] ??= []).push(handler);
    },
    fire: (name: string) => {
      (editor.handlers[name] ?? []).forEach((handler) => handler());
    },
    ui: {
      registry: {
        addButton: (name: string, spec: FakeButtonSpec) => {
          editor.buttons[name] = spec;
        },
        addToggleButton: (name: string, spec: FakeToggleButtonSpec) => {
          editor.toggleButtons[name] = spec;
        },
      },
    },
  };
  return editor;
}

/** Replaces `window.tinymce` / `window.tinyMCE` with the fake and returns it. */
export function installFakeTinyMCE(): FakeTinyMCE {
  const fake: FakeTinyMCE = {
    editors: new Map<string, FakeEditor>(),
    initOptions: [],
    get: (id: string) => fake.editors.get(id) ?? null,
    init: (options: RawEditorOptions) => {
      fake.initOptions.push(options);
      const selector = String(options['selector'] ?? '');
      const id = selector.startsWith('#') ? selector.slice(1) : selector;
      const editor = createEditor(fake, id);
      fake.editors.set(id, editor);

      const setup = options['setup'] as ((editor: unknown) => void) | undefined;
      setup?.(editor);
      editor.fire('init');
    },
  };

  const asGlobal = fake as unknown as TinyMCE;
  window.tinymce = asGlobal;
  window.tinyMCE = asGlobal;
  return fake;
}

/** Registers an already-initialised editor, as if the page had been loaded with content. */
export function seedEditor(
  tinymce: FakeTinyMCE,
  id: string,
  overrides: Partial<Pick<FakeEditor, 'content' | 'containerHeight' | 'synthesisEnabled'>> = {},
): FakeEditor {
  const editor = createEditor(tinymce, id);
  Object.assign(editor, overrides);
  tinymce.editors.set(id, editor);
  return editor;
}

/** Creates a toggle-button API object of the shape TinyMCE hands to `onAction` / `onSetup`. */
export function toggleButtonApi(): FakeToggleButtonApi {
  const api: FakeToggleButtonApi = {
    active: false,
    setActive: (state: boolean) => {
      api.active = state;
    },
  };
  return api;
}

export function asSynthesisEditor(editor: FakeEditor): SynthesisEditor {
  return editor as unknown as SynthesisEditor;
}
