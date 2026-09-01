import { beforeEach, describe, expect, it } from 'vitest';

import { bindDayPageHandlers, boot } from '../src/boot';
import { installFakeTinyMCE } from './helpers/tinymce';
import { installModalStubs, renderDayPage } from './helpers/dom';

describe('boot', () => {
  beforeEach(() => {
    renderDayPage({ rows: ['paragraph'] });
    installFakeTinyMCE();
    installModalStubs();
  });

  it('initialises server-rendered paragraphs and wires the toolbar', () => {
    boot();

    expect(window.tinymce).toBeDefined();
    document.getElementById('btn-new-para')!.click();

    expect(document.getElementById('edit-area')!.children).toHaveLength(2);
  });
});

describe('bindDayPageHandlers', () => {
  beforeEach(() => {
    renderDayPage({ rows: [] });
    installFakeTinyMCE();
  });

  it('appends an image row from the toolbar button', () => {
    bindDayPageHandlers();

    document.getElementById('btn-new-image')!.click();

    expect(document.getElementById('edit-area')!.querySelector('.image-entry')).not.toBeNull();
  });

  it('enables delete when ENTRY_EXISTS is set', () => {
    window.ENTRY_EXISTS = true;

    bindDayPageHandlers();

    expect(document.getElementById('btn-delete')!.classList.contains('btn-danger')).toBe(true);
  });
});
