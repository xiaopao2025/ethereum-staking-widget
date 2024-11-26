import invariant from 'tiny-invariant';
import { useQuery } from '@tanstack/react-query';
import { useLidoSDK, useLidoSDKL2 } from 'modules/web3';

export const useWstethBySteth = (steth?: bigint | null) => {
  const { wrap, chainId } = useLidoSDK();
  const { l2, isL2 } = useLidoSDKL2();

  return useQuery({
    queryKey: ['use-wsteth-by-steth', steth?.toString(), isL2, chainId],
    enabled: steth != null && !!(isL2 ? l2.wsteth : wrap),
    staleTime: Infinity,
    queryFn: () => {
      invariant(steth, '[useStETHByWstETH] The "wsteth" must be > 0n');

      return isL2
        ? l2.steth.convertToShares(steth)
        : wrap.convertStethToWsteth(steth);
    },
  });
};
