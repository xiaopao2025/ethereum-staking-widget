import { standardFetcher } from './standardFetcher';
import { ETH_API_ROUTES, getEthApiPath } from 'consts/api';
import { TOKENS_TO_WRAP } from 'features/wsteth/shared/types';
import { TOKENS_TO_WITHDRAWLS } from '../features/withdrawals/types/tokens-withdrawable';

type GetOneInchRateParams = {
  token: TOKENS_TO_WRAP | TOKENS_TO_WITHDRAWLS;
  amount?: bigint;
};

export const getOneInchRate = async ({
  token,
  amount,
}: GetOneInchRateParams) => {
  const params = new URLSearchParams({ token });
  if (amount) params.append('amount', amount.toString());
  const url = getEthApiPath(ETH_API_ROUTES.SWAP_ONE_INCH, params);
  const data = await standardFetcher<{
    rate: number;
    toReceive: string;
  }>(url);
  return {
    rate: data.rate,
    toReceive: BigInt(data.toReceive),
  };
};
