/**
 * Dynamic chat credits pricing based on actual token usage.
 *
 * Pricing follows OpenRouter's per-1M-token rates with a 25% premium.
 * Minimum charge is 1 credit (1 cent) per request.
 */

// Credit pricing constants (shared with image-models.ts)
export const CREDIT_USD = 0.01; // 1 credit = $0.01
export const PREMIUM_MULTIPLIER = 1.25; // 25% markup over OpenRouter price

// Fallback rates for unknown models (conservative estimate)
export const DEFAULT_PROMPT_RATE = 1.0; // $/1M tokens
export const DEFAULT_COMPLETION_RATE = 2.0; // $/1M tokens

// Maximum credits to reserve upfront (cap for estimation)
export const MAX_RESERVE_CREDITS = 50;

// Typical token usage for estimation
const ESTIMATED_INPUT_TOKENS = 500;
const ESTIMATED_OUTPUT_TOKENS = 1000;

export interface ModelPricing {
  prompt?: string;
  completion?: string;
}

/**
 * Calculate actual credit cost from token counts and model pricing.
 *
 * Formula:
 *   costUsd = (inputTokens * promptRate + outputTokens * completionRate) / 1_000_000
 *   credits = max(1, ceil(costUsd * PREMIUM_MULTIPLIER / CREDIT_USD))
 *
 * @param inputTokens - Number of input/prompt tokens
 * @param outputTokens - Number of output/completion tokens
 * @param pricing - Model pricing from OpenRouter ($/1M tokens as strings)
 * @returns Credit cost (minimum 1)
 */
export function computeChatCreditsCost(
  inputTokens: number,
  outputTokens: number,
  pricing?: ModelPricing
): number {
  const promptRate =
    parseFloat(pricing?.prompt || "") || DEFAULT_PROMPT_RATE;
  const completionRate =
    parseFloat(pricing?.completion || "") || DEFAULT_COMPLETION_RATE;

  const costUsd =
    (inputTokens * promptRate + outputTokens * completionRate) / 1_000_000;
  const withPremium = costUsd * PREMIUM_MULTIPLIER;
  const credits = Math.ceil(withPremium / CREDIT_USD);

  return Math.max(1, credits);
}

/**
 * Estimate credits for upfront reservation before streaming starts.
 *
 * Uses typical usage estimates (500 input + 1000 output tokens) to calculate
 * a reasonable reservation amount. Capped at MAX_RESERVE_CREDITS.
 *
 * @param pricing - Model pricing from OpenRouter
 * @returns Estimated credits to reserve
 */
export function estimateReservationCredits(pricing?: ModelPricing): number {
  const estimatedCost = computeChatCreditsCost(
    ESTIMATED_INPUT_TOKENS,
    ESTIMATED_OUTPUT_TOKENS,
    pricing
  );
  return Math.min(estimatedCost, MAX_RESERVE_CREDITS);
}

/**
 * Calculate the USD cost for a chat request (without premium).
 *
 * @param inputTokens - Number of input/prompt tokens
 * @param outputTokens - Number of output/completion tokens
 * @param pricing - Model pricing from OpenRouter
 * @returns Cost in USD
 */
export function computeChatCostUsd(
  inputTokens: number,
  outputTokens: number,
  pricing?: ModelPricing
): number {
  const promptRate =
    parseFloat(pricing?.prompt || "") || DEFAULT_PROMPT_RATE;
  const completionRate =
    parseFloat(pricing?.completion || "") || DEFAULT_COMPLETION_RATE;

  return (inputTokens * promptRate + outputTokens * completionRate) / 1_000_000;
}
