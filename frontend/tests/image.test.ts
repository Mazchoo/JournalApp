import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  appendImageToList,
  changeImageToVideoClass,
  createNewImage,
  deleteImage,
  editImageContent,
  editImageMeta,
  generateImageTemplate,
  initializeNewImage,
  insertNewImageToPosition,
  loadMeshResource,
  readImageResource,
  readVideoResource,
  showFileName,
  showImageUpload,
  uploadAllMediaFiles,
  zoomToImage,
} from '../src/entry/image';
import { initializeMeshRenderer } from '../src/entry/mesh';
import { stubAjax, type AjaxStub } from './helpers/ajax';
import { CSRF_TOKEN, fileNamed, renderDayPage } from './helpers/dom';
import { installFakeTinyMCE } from './helpers/tinymce';

vi.mock('../src/entry/mesh');

let ajax: AjaxStub;

/** Build a jQuery event whose target is the element matching the selector. */
function eventFrom(selector: string): JQuery.TriggeredEvent {
  return { target: document.querySelector(selector)! } as unknown as JQuery.TriggeredEvent;
}

/** Wait until the given element has a non-empty `src`. */
function waitForSrc(elementId: string): Promise<string> {
  return vi.waitFor(() => {
    const src = document.getElementById(elementId)!.getAttribute('src');
    if (src === null || src === '') throw new Error(`#${elementId} has no src yet`);
    return src;
  });
}

/** Wait until an upload label shows the expected file name. */
function waitForLabel(index: number, expected: string): Promise<void> {
  return vi.waitFor(() => {
    expect(document.getElementById(`upload-label${index}`)!.textContent).toBe(expected);
  });
}

beforeEach(() => {
  vi.mocked(initializeMeshRenderer).mockClear();
  renderDayPage({ rows: ['image'] });
  installFakeTinyMCE();
  ajax = stubAjax();
});

describe('generateImageTemplate', () => {
  it('substitutes every index placeholder', () => {
    const markup = generateImageTemplate(4);

    expect(markup).not.toContain('__INDEX__');
    expect(markup).toContain(`id='image4'`);
    expect(markup).toContain(`id='mesh-canvas4'`);
  });
});

describe('createNewImage', () => {
  it('advances CONTENT_INDEX and builds an image row', () => {
    const div = createNewImage();

    expect(window.CONTENT_INDEX).toBe(2);
    expect(div.className).toBe('row mt-4 image-entry');
    expect(div.querySelector('#image2')).not.toBeNull();
  });
});

describe('deleteImage', () => {
  it('removes the whole row and enables saving', () => {
    deleteImage(eventFrom('#delete-content0'));

    expect(document.getElementById('edit-area')!.children).toHaveLength(0);
    expect(document.getElementById('btn-save')!.classList.contains('btn-success')).toBe(true);
  });
});

describe('initializeNewImage', () => {
  it('toggles the Generate button between primary and outline', () => {
    initializeNewImage(0);
    const button = document.getElementById('allow-syn0')!;

    window.jQuery!('#allow-syn0').trigger('click');
    expect(button.classList.contains('btn-primary')).toBe(true);
    expect(button.classList.contains('btn-outline-secondary')).toBe(false);

    window.jQuery!('#allow-syn0').trigger('click');
    expect(button.classList.contains('btn-primary')).toBe(false);
    expect(button.classList.contains('btn-outline-secondary')).toBe(true);
  });

  it('enables saving when the Generate button is toggled', () => {
    initializeNewImage(0);

    window.jQuery!('#allow-syn0').trigger('click');

    expect(document.getElementById('btn-save')!.classList.contains('btn-success')).toBe(true);
  });

  it('wires the delete button of the row', () => {
    initializeNewImage(0);

    window.jQuery!('#delete-content0').trigger('click');

    expect(document.getElementById('edit-area')!.children).toHaveLength(0);
  });
});

describe('insertNewImageToPosition', () => {
  it('inserts a new image row above the clicked one', () => {
    renderDayPage({ rows: ['image', 'image'] });
    installFakeTinyMCE();

    const div = insertNewImageToPosition(eventFrom('#insert-image1'));

    const editArea = document.getElementById('edit-area')!;
    expect(editArea.children).toHaveLength(3);
    expect(editArea.children[1]).toBe(div);
    expect(window.CONTENT_INDEX).toBe(3);
  });
});

describe('appendImageToList', () => {
  it('appends the row and wires its buttons', () => {
    const div = appendImageToList();

    const editArea = document.getElementById('edit-area')!;
    expect(editArea.children[editArea.children.length - 1]).toBe(div);

    window.jQuery!('#allow-syn2').trigger('click');
    expect(document.getElementById('allow-syn2')!.classList.contains('btn-primary')).toBe(true);
  });
});

describe('readImageResource', () => {
  it('puts the data URL on the image and hides the video element', async () => {
    readImageResource(fileNamed('sunrise.png', 'binary', 'image/png'), 0);

    expect(await waitForSrc('image0')).toMatch(/^data:image\/png;base64,/);
    expect(document.getElementById('video0')!.style.visibility).toBe('hidden');
    expect(document.getElementById('btn-save')!.classList.contains('btn-success')).toBe(true);
  });
});

describe('readVideoResource', () => {
  it('puts the data URL on the video element and reveals it', async () => {
    readVideoResource(fileNamed('holiday.mp4', 'binary', 'video/mp4'), 0);

    expect(await waitForSrc('video0')).toMatch(/^data:video\/mp4;base64,/);
    const video = document.getElementById('video0')!;
    expect(video.style.visibility).toBe('visible');
    expect(video.style.height).toBe('auto');
  });
});

describe('loadMeshResource', () => {
  it('hides the image and video, reveals the canvas and starts the renderer', () => {
    const file = fileNamed('scan.glb');

    loadMeshResource(file, 0);

    expect(document.getElementById('image0')!.style.visibility).toBe('hidden');
    expect(document.getElementById('video0')!.style.visibility).toBe('hidden');

    const canvas = document.getElementById('mesh-canvas0')!;
    expect(canvas.style.visibility).toBe('visible');
    expect(canvas.style.height).toBe('400px');
    expect(vi.mocked(initializeMeshRenderer)).toHaveBeenCalledWith(
      canvas,
      file,
      expect.any(Function),
    );
  });

  it('enables saving through the renderer completion callback', () => {
    loadMeshResource(fileNamed('scan.glb'), 0);

    const onComplete = vi.mocked(initializeMeshRenderer).mock.calls[0]![2]!;
    onComplete();

    expect(document.getElementById('btn-save')!.classList.contains('btn-success')).toBe(true);
  });

  it('logs when there is no canvas for the row', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    loadMeshResource(fileNamed('scan.glb'), 99);

    expect(error).toHaveBeenCalledWith('Canvas element not found for contentId:', 99);
    expect(vi.mocked(initializeMeshRenderer)).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('showFileName', () => {
  it('writes the file name into the upload label', () => {
    showFileName(fileNamed('holiday snap.jpeg'), 0);

    expect(document.getElementById('upload-label0')!.textContent).toBe('holiday snap.jpeg');
  });
});

describe('uploadAllMediaFiles', () => {
  it('routes a single image to the image reader', async () => {
    uploadAllMediaFiles(0, [fileNamed('a.png', 'x', 'image/png')]);

    expect(await waitForSrc('image0')).toMatch(/^data:/);
    expect(document.getElementById('upload-label0')!.textContent).toBe('a.png');
  });

  it('routes a mesh to the mesh renderer', () => {
    uploadAllMediaFiles(0, [fileNamed('scan.glb')]);

    expect(vi.mocked(initializeMeshRenderer)).toHaveBeenCalledTimes(1);
  });

  it('logs unknown media types but still records the file name', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    uploadAllMediaFiles(0, [fileNamed('notes.txt')]);

    expect(log).toHaveBeenCalledWith('Unknown media type');
    expect(document.getElementById('upload-label0')!.textContent).toBe('notes.txt');
    log.mockRestore();
  });

  it('creates one extra row per additional file and fills them back to front', async () => {
    initializeNewImage(0);

    uploadAllMediaFiles(0, [
      fileNamed('first.png', 'x', 'image/png'),
      fileNamed('second.png', 'x', 'image/png'),
      fileNamed('third.png', 'x', 'image/png'),
    ]);

    expect(document.getElementById('edit-area')!.children).toHaveLength(3);
    await waitForLabel(0, 'third.png');
    await waitForLabel(2, 'second.png');
    await waitForLabel(3, 'first.png');
    expect(await waitForSrc('image3')).toMatch(/^data:/);
  });
});

describe('showImageUpload', () => {
  // jsdom rejects assignment to `HTMLInputElement.files`, so the event target is a stand-in
  // carrying only the two properties the handler reads.
  /** Build a change event whose target stands in for a file input. */
  function changeEvent(id: string, files: File[] | undefined): JQuery.TriggeredEvent {
    return { target: { id, files } } as unknown as JQuery.TriggeredEvent;
  }

  it('derives the row index from the input id and uploads its files', () => {
    initializeNewImage(0);

    showImageUpload(changeEvent('upload0', [fileNamed('scan.glb')]));

    expect(vi.mocked(initializeMeshRenderer)).toHaveBeenCalledTimes(1);
    expect(document.getElementById('upload-label0')!.textContent).toBe('scan.glb');
  });

  it('ignores inputs with no files', () => {
    showImageUpload(changeEvent('upload0', undefined));

    expect(document.getElementById('upload-label0')!.textContent).toBe('');
  });

  it('ignores inputs with no id', () => {
    showImageUpload(changeEvent('', [fileNamed('scan.glb')]));

    expect(vi.mocked(initializeMeshRenderer)).not.toHaveBeenCalled();
  });
});

describe('editImageContent', () => {
  it('applies the base64 source, file name and an active Generate button', () => {
    const applied = editImageContent(0, {
      base64: 'data:image/png;base64,AAA',
      file_name: 'sunrise.png',
      allow_ai_synthesis: 1,
    });

    expect(applied).toBe(true);
    expect(document.getElementById('image0')!.getAttribute('src')).toBe(
      'data:image/png;base64,AAA',
    );
    expect(document.getElementById('upload-label0')!.textContent).toBe('sunrise.png');

    const button = document.getElementById('allow-syn0')!;
    expect(button.classList.contains('btn-primary')).toBe(true);
    expect(button.classList.contains('btn-outline-secondary')).toBe(false);
  });

  it('leaves the Generate button inactive when synthesis is off', () => {
    editImageContent(0, { base64: 'x', file_name: 'a.png', allow_ai_synthesis: 0 });

    const button = document.getElementById('allow-syn0')!;
    expect(button.classList.contains('btn-primary')).toBe(false);
    expect(button.classList.contains('btn-outline-secondary')).toBe(true);
  });

  it('returns undefined when the row is missing', () => {
    expect(editImageContent(99, { base64: 'x', file_name: 'a.png' })).toBeUndefined();
  });
});

describe('editImageMeta', () => {
  it('updates the file name and Generate button without touching the source', () => {
    document.getElementById('image0')!.setAttribute('src', 'keep-me');

    const applied = editImageMeta(0, { file_name: 'holiday.mp4', allow_ai_synthesis: 1 });

    expect(applied).toBe(true);
    expect(document.getElementById('image0')!.getAttribute('src')).toBe('keep-me');
    expect(document.getElementById('upload-label0')!.textContent).toBe('holiday.mp4');
    expect(document.getElementById('allow-syn0')!.classList.contains('btn-primary')).toBe(true);
  });

  it('returns undefined when the row is missing', () => {
    expect(editImageMeta(99, { file_name: 'a.png' })).toBeUndefined();
  });
});

describe('changeImageToVideoClass', () => {
  it('swaps the content class and reveals the element', () => {
    const applied = changeImageToVideoClass(0);

    const image = document.getElementById('image0')!;
    expect(applied).toBe(true);
    expect(image.classList.contains('content-image')).toBe(false);
    expect(image.classList.contains('content-video')).toBe(true);
    expect(image.style.visibility).toBe('visible');
    expect(image.style.height).toBe('auto');
  });

  it('returns undefined when the row is missing', () => {
    expect(changeImageToVideoClass(99)).toBeUndefined();
  });
});

describe('zoomToImage', () => {
  /** Click the first image area as `zoomToImage` expects. */
  function clickImageArea(): void {
    const imageArea = document.querySelector('.image-area') as HTMLElement;
    zoomToImage.call(imageArea);
  }

  /** Stub `URL.createObjectURL`, which jsdom does not implement. */
  function stubCreateObjectURL(url: string): Mock {
    const createObjectURL = vi.fn(() => url);
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    return createObjectURL;
  }

  beforeEach(() => {
    document.getElementById('upload-label0')!.innerHTML = 'sunrise.png';
  });

  afterEach(() => {
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
  });

  it('requests the full image and shows it in the image modal', () => {
    clickImageArea();

    const settings = ajax.last();
    expect(settings.url).toBe('/get-image/');
    expect(settings.data).toEqual({
      file: 'sunrise.png',
      csrfmiddlewaretoken: CSRF_TOKEN,
      name: '2024-03-15',
    });

    ajax.succeed({ base64: 'data:image/png;base64,FULL' });
    expect(document.getElementById('image-preview')!.getAttribute('src')).toBe(
      'data:image/png;base64,FULL',
    );
    expect(document.getElementById('image-modal')!.classList.contains('show')).toBe(true);
  });

  it('falls back to the thumbnail source when the server reports an error', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    document.getElementById('image0')!.setAttribute('src', 'thumbnail');

    clickImageArea();
    ajax.succeed({ error: 'File missing' });

    expect(log).toHaveBeenCalledWith('Image error : File missing');
    expect(document.getElementById('image-preview')!.getAttribute('src')).toBe('thumbnail');
    log.mockRestore();
  });

  it('logs transport failures and still opens the modal', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    document.getElementById('image0')!.setAttribute('src', 'thumbnail');

    clickImageArea();
    ajax.fail('Gateway Timeout');

    expect(log).toHaveBeenCalledWith('Unknown error : Gateway Timeout');
    expect(document.getElementById('image-modal')!.classList.contains('show')).toBe(true);
    log.mockRestore();
  });

  it('requests the video as a blob and shows it in the video modal', () => {
    renderDayPage({ rows: ['video'] });
    ajax = stubAjax();
    document.getElementById('upload-label0')!.innerHTML = 'holiday.mp4';
    const createObjectURL = stubCreateObjectURL('blob:journal/video');

    clickImageArea();

    const settings = ajax.last();
    expect(settings.url).toBe('/get-video/');
    expect(settings.xhrFields).toEqual({ responseType: 'blob' });

    ajax.succeed(new Blob(['video-bytes'], { type: 'video/mp4' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(document.getElementById('video-preview')!.getAttribute('src')).toBe(
      'blob:journal/video',
    );
    expect(document.getElementById('video-modal')!.classList.contains('show')).toBe(true);
  });

  it('reports a JSON error body from the video endpoint', () => {
    renderDayPage({ rows: ['video'] });
    ajax = stubAjax();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    clickImageArea();
    ajax.fail('Bad Request', { responseJSON: { error: 'Video not found' } });

    expect(log).toHaveBeenCalledWith('Video error : Video not found');
    log.mockRestore();
  });

  it('falls back to the raw error when the video endpoint sends no JSON', () => {
    renderDayPage({ rows: ['video'] });
    ajax = stubAjax();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    clickImageArea();
    ajax.fail('Service Unavailable');

    expect(log).toHaveBeenCalledWith('Unknown error : Service Unavailable');
    log.mockRestore();
  });

  it('does nothing for an image id that carries no index', () => {
    document.getElementById('image0')!.id = 'image';

    clickImageArea();

    expect(ajax.calls).toHaveLength(0);
  });
});
