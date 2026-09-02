import { describe, expect, it } from 'vitest';

import * as journal from '../src/index';

/**
 * The IIFE still publishes the old static/JS names on `window` for standalone
 * pages such as test_mesh.html. templates/day.html no longer calls them; boot()
 * does that job.
 */
const NAMES_USED_BY_BOOT = [
  'initializeServerRenderedContent',
  'appendParagraphToList',
  'appendImageToList',
  'deleteContent',
  'saveToDatabase',
  'moveEntry',
  'zoomToImage',
  'enableDeleteButton',
  'boot',
  'bindDayPageHandlers',
] as const;

/** Every function the old static/JS files leaked into the global scope. */
const NAMES_FROM_STATIC_JS = [
  // common.utility.js
  'reverseString',
  'getIndexInArr',
  'deleteParentDiv',
  'removeItem',
  'componentFromTemplate',
  'changeTooltipTextFromInput',
  'reorderOneDivFromAnother',
  'refreshScrollSpies',
  'insertNewObjectIntoEditArea',
  'getContentType',
  'getParentDivOfObject',
  'moveObjectUp',
  'moveObjectDown',
  'isVideoFile',
  'isImageFile',
  'isMeshFile',
  // tiny.mce.helper.js
  'createTinyMCE',
  'getMCEComponentHeight',
  'resetMCE',
  // entry.paragraph.js
  'generateParagraphTemplate',
  'deleteParagraph',
  'createNewParagraph',
  'editParagraphContent',
  'createInitFunction',
  'initializeNewParagraph',
  'insertNewParagraphToPosition',
  'appendParagraphToList',
  // entry.mesh.js
  'initializeMeshRenderer',
  'renderGLB',
  'computeNormals',
  // entry.image.js
  'generateImageTemplate',
  'createNewImage',
  'deleteImage',
  'initializeNewImage',
  'insertNewImageToPosition',
  'appendImageToList',
  'readImageResource',
  'loadMeshResource',
  'showFileName',
  'uploadAllMediaFiles',
  'showImageUpload',
  'editImageContent',
  'editImageMeta',
  'zoomToImage',
  // entry.video.js
  'readVideoResource',
  'changeImageToVideoClass',
  // entry.delete.js
  'enableDeleteButton',
  'disableDeleteButton',
  'deleteFromDatabase',
  'deleteContent',
  // entry.save.js
  'generateSaveEntry',
  'saveEntryToDatabase',
  'getSaveData',
  'saveToDatabase',
  'enableSaveButton',
  'disableSaveButton',
  // entry.load.js
  'loadServerRenderedImage',
  'loadServerRenderedVideo',
  'initializeServerRenderedContent',
  // entry.move.js
  'getDestinationSlug',
  'makeMoveRequest',
  'moveEntry',
] as const;

describe('public API', () => {
  it.each([...new Set(NAMES_FROM_STATIC_JS)])('exports %s', (name) => {
    expect(typeof (journal as Record<string, unknown>)[name]).toBe('function');
  });

  it('exports boot and bindDayPageHandlers', () => {
    expect(typeof journal.boot).toBe('function');
    expect(typeof journal.bindDayPageHandlers).toBe('function');
  });
});

describe('main entry point', () => {
  it('publishes every name boot and standalone pages still call', async () => {
    await import('../src/main');

    for (const name of [...NAMES_FROM_STATIC_JS, ...NAMES_USED_BY_BOOT]) {
      expect(typeof (window as unknown as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
