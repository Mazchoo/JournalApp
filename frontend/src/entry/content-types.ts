/** Shape of the image/video payloads returned by main.content_generation.load_entry. */
export interface ImageContent {
  base64?: string;
  file_name?: string;
  allow_ai_synthesis?: number;
}
