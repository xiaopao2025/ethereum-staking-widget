import { LIDO_TOKENS } from '@lidofinance/lido-ethereum-sdk/common';

export const TOKENS_TO_WRAP = {
  [LIDO_TOKENS.eth]: LIDO_TOKENS.eth,
  [LIDO_TOKENS.steth]: LIDO_TOKENS.steth,
  // On L2
  [LIDO_TOKENS.wsteth]: LIDO_TOKENS.wsteth,
} as const;

export type TOKENS_TO_WRAP = keyof typeof TOKENS_TO_WRAP;
