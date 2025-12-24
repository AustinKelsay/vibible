/**
 * Utility functions for handling OpenAI SDK v6 function/tool call output format.
 * 
 * In OpenAI SDK v6, the `output` field can be either:
 * - A string (legacy format)
 * - An array of ResponseInputText | ResponseInputImage | ResponseInputFile objects
 */

/**
 * Response input types for OpenAI SDK v6 function/tool call outputs.
 */
export type ResponseInputText = {
  type: "text";
  text: string;
};

export type ResponseInputImage = {
  type: "image";
  url?: string;
  path?: string;
};

export type ResponseInputFile = {
  type: "file";
  url?: string;
  path?: string;
};

/**
 * Union type representing a single response input item.
 */
export type ResponseInput = ResponseInputText | ResponseInputImage | ResponseInputFile;

/**
 * Function/tool call output format in OpenAI SDK v6.
 * Can be a string (legacy) or an array of response input objects.
 */
export type FunctionOutput = string | Array<ResponseInput> | null | undefined;

/**
 * Extracted content from function output.
 */
export interface ExtractedOutput {
  text: string[];
  images: Array<{ url?: string; path?: string }>;
  files: Array<{ url?: string; path?: string }>;
}

/**
 * Extracts text, images, and files from OpenAI SDK v6 function/tool call output.
 * Handles both string (legacy) and array formats.
 * 
 * @param output - The output field from a function/tool call (string, array, null, or undefined)
 * @returns Object containing arrays of extracted text, images, and files
 * 
 * @example
 * ```ts
 * // String output (legacy)
 * const result1 = extractOutput("Hello world");
 * // { text: ["Hello world"], images: [], files: [] }
 * 
 * // Array output (v6)
 * const result2 = extractOutput([
 *   { type: "text", text: "Hello" },
 *   { type: "image", url: "https://example.com/img.png" },
 *   { type: "file", path: "/path/to/file.txt" }
 * ]);
 * // { text: ["Hello"], images: [{ url: "https://example.com/img.png" }], files: [{ path: "/path/to/file.txt" }] }
 * ```
 */
export function extractOutput(output: FunctionOutput): ExtractedOutput {
  const result: ExtractedOutput = {
    text: [],
    images: [],
    files: [],
  };

  // Handle null/undefined
  if (output == null) {
    return result;
  }

  // Handle string format (legacy)
  if (typeof output === "string") {
    if (output.trim().length > 0) {
      result.text.push(output);
    }
    return result;
  }

  // Handle array format (v6)
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!item || typeof item !== "object") {
        continue;
      }

      switch (item.type) {
        case "text": {
          const textItem = item as ResponseInputText;
          if (textItem.text && typeof textItem.text === "string" && textItem.text.trim().length > 0) {
            result.text.push(textItem.text);
          }
          break;
        }
        case "image": {
          const imageItem = item as ResponseInputImage;
          const imageData: { url?: string; path?: string } = {};
          if (imageItem.url) imageData.url = imageItem.url;
          if (imageItem.path) imageData.path = imageItem.path;
          if (imageData.url || imageData.path) {
            result.images.push(imageData);
          }
          break;
        }
        case "file": {
          const fileItem = item as ResponseInputFile;
          const fileData: { url?: string; path?: string } = {};
          if (fileItem.url) fileData.url = fileItem.url;
          if (fileItem.path) fileData.path = fileItem.path;
          if (fileData.url || fileData.path) {
            result.files.push(fileData);
          }
          break;
        }
        default:
          // Unknown type, skip
          break;
      }
    }
    return result;
  }

  // Unexpected format - return empty result
  return result;
}

/**
 * Converts OpenAI SDK v6 function/tool call output to a string representation.
 * Extracts all text content and includes metadata about images/files.
 * 
 * @param output - The output field from a function/tool call
 * @returns String representation of the output
 * 
 * @example
 * ```ts
 * // String output
 * toStringOutput("Hello") // "Hello"
 * 
 * // Array output
 * toStringOutput([
 *   { type: "text", text: "Hello" },
 *   { type: "image", url: "https://example.com/img.png" }
 * ]) // "Hello\n[Image: https://example.com/img.png]"
 * ```
 */
export function toStringOutput(output: FunctionOutput): string {
  if (output == null) {
    return "";
  }

  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output)) {
    const parts: string[] = [];

    for (const item of output) {
      if (!item || typeof item !== "object") {
        continue;
      }

      switch (item.type) {
        case "text": {
          const textItem = item as ResponseInputText;
          if (textItem.text && typeof textItem.text === "string") {
            parts.push(textItem.text);
          }
          break;
        }
        case "image": {
          const imageItem = item as ResponseInputImage;
          const url = imageItem.url || imageItem.path;
          if (url) {
            parts.push(`[Image: ${url}]`);
          }
          break;
        }
        case "file": {
          const fileItem = item as ResponseInputFile;
          const path = fileItem.url || fileItem.path;
          if (path) {
            parts.push(`[File: ${path}]`);
          }
          break;
        }
      }
    }

    return parts.join("\n");
  }

  return "";
}

