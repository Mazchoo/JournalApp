import { describe, expect, it } from 'vitest';

import * as journal from '../src/index';

/**
 * templates/day.html calls these names directly from its inline `<script>`. Until that block
 * moves into this project, the bundle has to keep publishing them on `window` under exactly
 * the names the old static/JS files created.
 */
const NAMES_USED_BY_DAY_HTML = [
  'initializeServerRenderedContent',
  'appendParagraphToList',
  'appendImageToList',
  'deleteContent',
  'saveToDatabase',
  'moveEntry',
  'zoomToImage',
  'enableDeleteButton',
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
  'getContentId',
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
  'readVideoResource',
  'loadMeshResource',
  'showFileName',
  'uploadAllMediaFiles',
  'showImageUpload',
  'editImageContent',
  'editImageMeta',
  'changeImageToVideoClass',
  'zoomToImage',
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
});

describe('main entry point', () => {
  it('publishes every name the inline day.html script calls', async () => {
    await import('../src/main');

    for (const name of NAMES_USED_BY_DAY_HTML) {
      expect(typeof (window as unknown as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
