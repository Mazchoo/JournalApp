import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PARAGRAPH_EDITOR_HEIGHT_PX } from '../src/display-config';
import {
  appendParagraphToList,
  createInitFunction,
  createNewParagraph,
  deleteParagraph,
  editParagraphContent,
  generateParagraphTemplate,
  initializeNewParagraph,
  insertNewParagraphToPosition,
} from '../src/entry/paragraph';
import {
  defineInnerText,
  installModalStubs,
  renderDayPage,
  type ModalStubs,
} from './helpers/dom';
import { installFakeTinyMCE, seedEditor, type FakeTinyMCE } from './helpers/tinymce';

let tinymce: FakeTinyMCE;
let modals: ModalStubs;

/** Build a click event whose target is the element matching the selector. */
function eventFrom(selector: string): Event {
  return { target: document.querySelector(selector)! } as unknown as Event;
}

/** Attach a TinyMCE-like iframe so the delete guard can read its innerText. */
function attachEditorIframe(index: string, text: string): void {
  const region = document.querySelector(`[name='paragraph${index}']`)!;
  const iframe = document.createElement('iframe');
  iframe.className = 'tox-edit-area__iframe';
  region.appendChild(iframe);
  defineInnerText(iframe.contentDocument!.body, text);
}

beforeEach(() => {
  renderDayPage({ rows: ['paragraph'] });
  tinymce = installFakeTinyMCE();
  modals = installModalStubs();
});

describe('generateParagraphTemplate', () => {
  it('substitutes every index placeholder', () => {
    const markup = generateParagraphTemplate('7');

    expect(markup).not.toContain('{{ item.index }}');
    expect(markup).toContain(`name='paragraph7'`);
    expect(markup).toContain(`id='move-content-down7'`);
  });
});

describe('createNewParagraph', () => {
  it('advances CONTENT_INDEX and builds a paragraph row', () => {
    const div = createNewParagraph();

    expect(window.CONTENT_INDEX).toBe(2);
    expect(div.className).toBe('row mt-3 paragraph-entry');
    expect(div.querySelector('#paragraph2')).not.toBeNull();
  });
});

describe('editParagraphContent', () => {
  it('writes the text into the matching editor', () => {
    const editor = seedEditor(tinymce, 'paragraph0');

    expect(editParagraphContent('0', '<p>Hello</p>')).toBe(true);
    expect(editor.content).toBe('<p>Hello</p>');
  });

  it('reports failure when the editor does not exist', () => {
    expect(editParagraphContent('9', 'text')).toBe(false);
  });

  it.each([
    ['a missing index', undefined, 'text'],
    ['missing text', '0', undefined],
  ])('reports failure for %s', (_label, index, text) => {
    expect(editParagraphContent(index, text)).toBe(false);
  });
});

describe('createInitFunction', () => {
  it('returns a no-op when there is no text to restore', () => {
    const editor = seedEditor(tinymce, 'paragraph0', { content: 'untouched' });

    createInitFunction('0', '')();

    expect(editor.content).toBe('untouched');
  });

  it('returns a function that restores the text', () => {
    const editor = seedEditor(tinymce, 'paragraph0');

    createInitFunction('0', '<p>Restored</p>')();

    expect(editor.content).toBe('<p>Restored</p>');
  });
});

describe('initializeNewParagraph', () => {
  it('creates the editor at the requested height and synthesis state', () => {
    initializeNewParagraph('0', 320, '', false);

    const options = tinymce.initOptions[0]!;
    expect(options['selector']).toBe('#paragraph0');
    expect(options['height']).toBe(320);
  });

  it('defaults to the configured editor height', () => {
    initializeNewParagraph('0');

    expect(tinymce.initOptions[0]!['height']).toBe(PARAGRAPH_EDITOR_HEIGHT_PX);
  });

  it('restores existing text through the init callback', () => {
    initializeNewParagraph('0', 220, '<p>From the database</p>');

    expect(tinymce.get('paragraph0')!.content).toBe('<p>From the database</p>');
  });

  it('wires the five edit buttons of the row', () => {
    initializeNewParagraph('0');
    attachEditorIframe('0', 'not empty');

    document.getElementById('delete-content0')!.click();

    expect(modals.showCallbackModal).toHaveBeenCalledTimes(1);
  });

  it('moves the row when the move buttons are clicked', () => {
    renderDayPage({ rows: ['paragraph', 'paragraph'] });
    tinymce = installFakeTinyMCE();
    initializeNewParagraph('0');
    initializeNewParagraph('1');

    document.getElementById('move-content-up1')!.click();

    const editArea = document.getElementById('edit-area')!;
    expect(editArea.children[0]!.querySelector('#paragraph1')).not.toBeNull();
  });
});

describe('deleteParagraph', () => {
  it('deletes an empty paragraph without asking', () => {
    attachEditorIframe('0', '   \n  ');

    deleteParagraph(eventFrom('#delete-content0'));

    expect(modals.showCallbackModal).not.toHaveBeenCalled();
    expect(document.getElementById('edit-area')!.children).toHaveLength(0);
    expect(document.getElementById('btn-save')!.classList.contains('btn-success')).toBe(true);
  });

  it('asks before deleting a paragraph that has text', () => {
    attachEditorIframe('0', 'Something worth keeping');

    deleteParagraph(eventFrom('#delete-content0'));

    expect(modals.showCallbackModal).toHaveBeenCalledWith(
      'Are you sure?',
      'Are you sure you want to delete this non-empty paragraph? There is no way to undo this.',
      'Confirm',
      expect.any(Function),
    );
    expect(document.getElementById('edit-area')!.children).toHaveLength(1);
  });

  it('deletes once the confirmation callback runs', () => {
    attachEditorIframe('0', 'Something worth keeping');

    deleteParagraph(eventFrom('#delete-content0'));
    modals.confirmLast(modals.showCallbackModal);

    expect(document.getElementById('edit-area')!.children).toHaveLength(0);
  });

  it('asks for confirmation when no editor iframe has been rendered yet', () => {
    deleteParagraph(eventFrom('#delete-content0'));

    expect(modals.showCallbackModal).toHaveBeenCalledTimes(1);
  });
});

describe('insertNewParagraphToPosition', () => {
  beforeEach(() => {
    renderDayPage({ rows: ['paragraph', 'paragraph'] });
    tinymce = installFakeTinyMCE();
  });

  it('inserts a new row above the clicked one and initialises its editor', () => {
    const div = insertNewParagraphToPosition(eventFrom('#insert-paragraph1'));

    const editArea = document.getElementById('edit-area')!;
    expect(editArea.children).toHaveLength(3);
    expect(editArea.children[1]).toBe(div);
    expect(window.CONTENT_INDEX).toBe(3);
    expect(tinymce.get('paragraph3')).not.toBeNull();
  });

  it('enables the save button', () => {
    insertNewParagraphToPosition(eventFrom('#insert-paragraph1'));

    expect(document.getElementById('btn-save')!.classList.contains('btn-success')).toBe(true);
  });
});

describe('appendParagraphToList', () => {
  it('appends the row at the end of the edit area', () => {
    const div = appendParagraphToList();

    const editArea = document.getElementById('edit-area')!;
    expect(editArea.children[editArea.children.length - 1]).toBe(div);
    expect(window.CONTENT_INDEX).toBe(2);
  });

  it('tolerates being used directly as a click handler', () => {
    document.getElementById('btn-new-para')!.addEventListener('click', appendParagraphToList);

    document.getElementById('btn-new-para')!.click();

    expect(document.getElementById('edit-area')!.children).toHaveLength(2);
    expect(tinymce.initOptions[0]!['height']).toBe(PARAGRAPH_EDITOR_HEIGHT_PX);
  });

  it('passes an explicit height and text through to the editor', () => {
    appendParagraphToList(undefined, 400, '<p>Loaded</p>');

    expect(tinymce.initOptions[0]!['height']).toBe(400);
    expect(tinymce.get('paragraph2')!.content).toBe('<p>Loaded</p>');
  });
});

describe('paragraph edit buttons after a fresh insert', () => {
  it('renumbers the buttons so the new row deletes itself', () => {
    const div = appendParagraphToList()!;
    const deleteButton = div.querySelector('#delete-content2')!;

    deleteParagraph({ target: deleteButton } as unknown as Event);

    expect(modals.showCallbackModal).toHaveBeenCalledTimes(1);
    modals.confirmLast(modals.showCallbackModal);
    expect(document.getElementById('edit-area')!.querySelector('#paragraph2')).toBeNull();
  });
});

describe('CONTENT_INDEX bookkeeping', () => {
  it('keeps increasing across mixed inserts', () => {
    renderDayPage({ rows: ['paragraph'], contentIndex: 5 });
    installFakeTinyMCE();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    appendParagraphToList();
    appendParagraphToList();

    expect(window.CONTENT_INDEX).toBe(7);
  });
});
