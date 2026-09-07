import { PageElement } from "../page-element";

/** Full-size video shown in the video modal (`#video-preview`). */
export class VideoPreview extends PageElement<HTMLVideoElement> {
  constructor() {
    super("video-preview");
  }

  /** Set the preview source. */
  setSrc(src: string): void {
    this.resolve()?.setAttribute("src", src);
  }

  /** Pause, rewind, and clear the source when the video modal closes. */
  reset(): void {
    const video = this.resolve();
    if (video === null) return;
    video.pause();
    video.currentTime = 0;
    video.src = "";
  }
}
