/**
 * Unit tests for OpenAI SDK v6 output handling utilities.
 */

import { describe, it, expect } from "vitest";
import {
  extractOutput,
  toStringOutput,
  type FunctionOutput,
} from "./openai-output";

describe("extractOutput", () => {
  it("should handle null output", () => {
    const result = extractOutput(null);
    expect(result).toEqual({
      text: [],
      images: [],
      files: [],
    });
  });

  it("should handle undefined output", () => {
    const result = extractOutput(undefined);
    expect(result).toEqual({
      text: [],
      images: [],
      files: [],
    });
  });

  it("should handle string output (legacy format)", () => {
    const result = extractOutput("Hello world");
    expect(result).toEqual({
      text: ["Hello world"],
      images: [],
      files: [],
    });
  });

  it("should handle empty string output", () => {
    const result = extractOutput("");
    expect(result).toEqual({
      text: [],
      images: [],
      files: [],
    });
  });

  it("should handle whitespace-only string output", () => {
    const result = extractOutput("   ");
    expect(result).toEqual({
      text: [],
      images: [],
      files: [],
    });
  });

  it("should handle array output with text only", () => {
    const output: FunctionOutput = [
      { type: "text", text: "First text" },
      { type: "text", text: "Second text" },
    ];
    const result = extractOutput(output);
    expect(result).toEqual({
      text: ["First text", "Second text"],
      images: [],
      files: [],
    });
  });

  it("should handle array output with images", () => {
    const output: FunctionOutput = [
      { type: "image", url: "https://example.com/image1.png" },
      { type: "image", path: "/path/to/image2.jpg" },
    ];
    const result = extractOutput(output);
    expect(result).toEqual({
      text: [],
      images: [
        { url: "https://example.com/image1.png" },
        { path: "/path/to/image2.jpg" },
      ],
      files: [],
    });
  });

  it("should handle array output with files", () => {
    const output: FunctionOutput = [
      { type: "file", url: "https://example.com/file1.pdf" },
      { type: "file", path: "/path/to/file2.txt" },
    ];
    const result = extractOutput(output);
    expect(result).toEqual({
      text: [],
      images: [],
      files: [
        { url: "https://example.com/file1.pdf" },
        { path: "/path/to/file2.txt" },
      ],
    });
  });

  it("should handle mixed array output", () => {
    const output: FunctionOutput = [
      { type: "text", text: "Hello" },
      { type: "image", url: "https://example.com/img.png" },
      { type: "text", text: "World" },
      { type: "file", path: "/path/to/file.txt" },
    ];
    const result = extractOutput(output);
    expect(result).toEqual({
      text: ["Hello", "World"],
      images: [{ url: "https://example.com/img.png" }],
      files: [{ path: "/path/to/file.txt" }],
    });
  });

  it("should skip empty text entries", () => {
    const output: FunctionOutput = [
      { type: "text", text: "Valid text" },
      { type: "text", text: "" },
      { type: "text", text: "   " },
    ];
    const result = extractOutput(output);
    expect(result.text).toEqual(["Valid text"]);
  });

  it("should skip images without url or path", () => {
    const output: FunctionOutput = [
      { type: "image", url: "https://example.com/img.png" },
      { type: "image" },
    ];
    const result = extractOutput(output);
    expect(result.images).toEqual([{ url: "https://example.com/img.png" }]);
  });

  it("should skip files without url or path", () => {
    const output: FunctionOutput = [
      { type: "file", path: "/path/to/file.txt" },
      { type: "file" },
    ];
    const result = extractOutput(output);
    expect(result.files).toEqual([{ path: "/path/to/file.txt" }]);
  });

  it("should handle images with both url and path", () => {
    const output: FunctionOutput = [
      { type: "image", url: "https://example.com/img.png", path: "/local/path.png" },
    ];
    const result = extractOutput(output);
    expect(result.images).toEqual([
      { url: "https://example.com/img.png", path: "/local/path.png" },
    ]);
  });

  it("should handle files with both url and path", () => {
    const output: FunctionOutput = [
      { type: "file", url: "https://example.com/file.pdf", path: "/local/file.pdf" },
    ];
    const result = extractOutput(output);
    expect(result.files).toEqual([
      { url: "https://example.com/file.pdf", path: "/local/file.pdf" },
    ]);
  });

  it("should skip invalid array items", () => {
    const output = [
      { type: "text", text: "Valid" },
      null,
      undefined,
      "invalid string",
      { type: "unknown" },
    ] as unknown as FunctionOutput;
    const result = extractOutput(output);
    expect(result).toEqual({
      text: ["Valid"],
      images: [],
      files: [],
    });
  });
});

describe("toStringOutput", () => {
  it("should handle null output", () => {
    expect(toStringOutput(null)).toBe("");
  });

  it("should handle undefined output", () => {
    expect(toStringOutput(undefined)).toBe("");
  });

  it("should handle string output", () => {
    expect(toStringOutput("Hello world")).toBe("Hello world");
  });

  it("should handle array output with text only", () => {
    const output: FunctionOutput = [
      { type: "text", text: "First" },
      { type: "text", text: "Second" },
    ];
    expect(toStringOutput(output)).toBe("First\nSecond");
  });

  it("should handle array output with images", () => {
    const output: FunctionOutput = [
      { type: "image", url: "https://example.com/img.png" },
      { type: "image", path: "/path/to/image.jpg" },
    ];
    expect(toStringOutput(output)).toBe("[Image: https://example.com/img.png]\n[Image: /path/to/image.jpg]");
  });

  it("should handle array output with files", () => {
    const output: FunctionOutput = [
      { type: "file", url: "https://example.com/file.pdf" },
      { type: "file", path: "/path/to/file.txt" },
    ];
    expect(toStringOutput(output)).toBe("[File: https://example.com/file.pdf]\n[File: /path/to/file.txt]");
  });

  it("should handle mixed array output", () => {
    const output: FunctionOutput = [
      { type: "text", text: "Hello" },
      { type: "image", url: "https://example.com/img.png" },
      { type: "text", text: "World" },
      { type: "file", path: "/path/to/file.txt" },
    ];
    expect(toStringOutput(output)).toBe("Hello\n[Image: https://example.com/img.png]\nWorld\n[File: /path/to/file.txt]");
  });

  it("should prefer url over path for images", () => {
    const output: FunctionOutput = [
      { type: "image", url: "https://example.com/img.png", path: "/local/path.png" },
    ];
    expect(toStringOutput(output)).toBe("[Image: https://example.com/img.png]");
  });

  it("should prefer url over path for files", () => {
    const output: FunctionOutput = [
      { type: "file", url: "https://example.com/file.pdf", path: "/local/file.pdf" },
    ];
    expect(toStringOutput(output)).toBe("[File: https://example.com/file.pdf]");
  });

  it("should handle empty array", () => {
    expect(toStringOutput([])).toBe("");
  });

  it("should skip invalid items in array", () => {
    const output = [
      { type: "text", text: "Valid" },
      null,
      { type: "unknown" },
    ] as unknown as FunctionOutput;
    expect(toStringOutput(output)).toBe("Valid");
  });
});

