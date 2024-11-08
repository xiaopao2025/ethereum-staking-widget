import { useMemo } from 'react';
import { BigNumber } from 'ethers';

import { useMaxGasPrice } from 'modules/web3';
import { useEthUsd } from './use-eth-usd';

export const useTxCostInUsd = (gasLimit?: bigint, chainId?: number) => {
  const { maxGasPrice, ...maxGasPriceState } = useMaxGasPrice(chainId);

  const ethAmount = useMemo(
    () => (maxGasPrice && gasLimit ? maxGasPrice * gasLimit : undefined),
    [gasLimit, maxGasPrice],
  );

  // TODO: NEW_SDK (refactor useEthUsd to work with bigint)
  const { usdAmount, ...ethUsdState } = useEthUsd(
    ethAmount ? BigNumber.from(ethAmount) : undefined,
  );

  return {
    maxGasPrice: maxGasPrice,
    txCostUsd: usdAmount,

    get initialLoading() {
      return maxGasPriceState.initialLoading || ethUsdState.initialLoading;
    },
    get error() {
      return maxGasPriceState.error || ethUsdState.error;
    },
    get loading() {
      return maxGasPriceState.loading || ethUsdState.loading;
    },
    update() {
      return Promise.all([maxGasPriceState.update(), ethUsdState.update()]);
    },
  };
};
