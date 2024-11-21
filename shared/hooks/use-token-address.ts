import invariant from 'tiny-invariant';
import type { Address } from 'viem';
import {
  CHAINS,
  CONTRACTS_BY_TOKENS,
  LIDO_L2_CONTRACT_ADDRESSES,
  LIDO_L2_CONTRACT_NAMES,
} from '@lidofinance/lido-ethereum-sdk/common';
import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk/core';
import { useQuery } from '@tanstack/react-query';

import { STRATEGY_CONSTANT } from 'consts/react-query-strategies';
import { useLidoSDK } from 'modules/web3';

const fetchTokenAddress = async (
  token: string,
  core: LidoSDKCore,
  isL2: boolean,
): Promise<Address> => {
  if (isL2) {
    const address =
      LIDO_L2_CONTRACT_ADDRESSES[core.chainId as CHAINS]?.[
        token as LIDO_L2_CONTRACT_NAMES
      ];
    invariant(address, `Do not have address for ${token} on ${core.chainId}`);
    return address;
  } else {
    const address = await core.getContractAddress(
      CONTRACTS_BY_TOKENS[token as keyof typeof CONTRACTS_BY_TOKENS],
    );
    invariant(address, `Do not have address for ${token} on ${core.chainId}`);
    return address;
  }
};

export const useTokenAddress = (token: string): Address | undefined => {
  const { core, isL2 } = useLidoSDK();

  const { data: address } = useQuery({
    queryKey: ['tokenAddress', token, core, isL2],
    enabled: !!token,
    ...STRATEGY_CONSTANT,
    queryFn: () => fetchTokenAddress(token, core, isL2),
  });

  return address;
};
