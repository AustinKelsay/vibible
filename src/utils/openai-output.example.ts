/**
 * Example usage of OpenAI SDK v6 output handling utilities.
 * 
 * This file demonstrates how to use the extractOutput and toStringOutput
 * functions when processing function/tool call outputs from OpenAI SDK v6.
 * 
 * When using OpenAI SDK v6 with function/tool calls, the output field
 * can be either a string (legacy) or an array of ResponseInput objects.
 */

import { extractOutput, toStringOutput, type FunctionOutput } from "./openai-output";

/**
 * Example: Processing a function call output from OpenAI SDK v6.
 * 
 * This would typically be used in code like:
 * 
 * ```ts
 * const response = await openai.chat.completions.create({
 *   model: "gpt-4",
 *   messages: [...],
 *   tools: [...],
 * });
 * 
 * const toolCall = response.choices[0].message.tool_calls?.[0];
 * if (toolCall?.function?.output) {
 *   const extracted = extractOutput(toolCall.function.output);
 *   // Use extracted.text, extracted.images, extracted.files
 * }
 * ```
 */
export function exampleProcessFunctionOutput(output: FunctionOutput) {
  // Extract structured data
  const extracted = extractOutput(output);

  // Access text content
  if (extracted.text.length > 0) {
    console.log("Text outputs:", extracted.text);
  }

  // Access image URLs/paths
  if (extracted.images.length > 0) {
    extracted.images.forEach((image) => {
      if (image.url) {
        console.log("Image URL:", image.url);
      }
      if (image.path) {
        console.log("Image path:", image.path);
      }
    });
  }

  // Access file URLs/paths
  if (extracted.files.length > 0) {
    extracted.files.forEach((file) => {
      if (file.url) {
        console.log("File URL:", file.url);
      }
      if (file.path) {
        console.log("File path:", file.path);
      }
    });
  }

  // Or convert to string representation
  const stringRep = toStringOutput(output);
  console.log("String representation:", stringRep);
}

/**
 * Example: Handling both string and array output formats.
 */
export function exampleHandleBothFormats(output: FunctionOutput) {
  // The utility functions handle both formats automatically
  const extracted = extractOutput(output);

  // Process text (works for both string and array formats)
  const allText = extracted.text.join(" ");
  return allText;
}

