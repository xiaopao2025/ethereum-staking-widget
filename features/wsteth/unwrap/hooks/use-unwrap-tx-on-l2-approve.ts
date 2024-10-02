import { useMemo, useState, useEffect, useCallback } from 'react';
import type { BigNumber } from 'ethers';

import { runWithTransactionLogger } from 'utils';
import { useLidoSDK } from 'providers/lido-sdk';
import { useDappStatus } from 'shared/hooks/use-dapp-status';

type UseUnwrapTxApproveArgs = {
  amount: BigNumber;
};

export const useUnwrapTxOnL2Approve = ({ amount }: UseUnwrapTxApproveArgs) => {
  const { isDappActiveOnL2 } = useDappStatus();
  const { sdk } = useLidoSDK();
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [isApprovalNeededBeforeUnwrap, setIsApprovalNeededBeforeUnwrap] =
    useState<boolean>(true);

  const refetchAllowance = useCallback(() => {
    const checkAllowance = async () => {
      try {
        const allowance = await sdk.l2.getWstethForWrapAllowance();
        setAllowance(allowance);
        setIsApprovalNeededBeforeUnwrap(amount.gt(allowance));
      } catch (error) {
        console.error('Error fetching allowance on L2:', error);
      }
    };

    void checkAllowance();
  }, [sdk.l2, amount]);

  const processApproveTx = useCallback(
    async ({ onTxSent }: { onTxSent: (txHash: string) => void }) => {
      try {
        const approveTxHash = (
          await runWithTransactionLogger('Approve signing on L2', () =>
            sdk.l2.approveWstethForWrap({
              value: amount.toBigInt(),
            }),
          )
        ).hash;

        void onTxSent?.(approveTxHash);

        refetchAllowance();

        return approveTxHash;
      } catch (error) {
        console.error('Error approve on L2:', error);
      }
    },
    [sdk.l2, amount, refetchAllowance],
  );

  useEffect(() => {
    if (sdk.core.web3Provider && isDappActiveOnL2) {
      void refetchAllowance();
    }
  }, [isDappActiveOnL2, refetchAllowance, sdk.core.web3Provider]);

  return useMemo(
    () => ({
      processApproveTx,
      refetchAllowance,
      allowance,
      isApprovalNeededBeforeUnwrap,
      isShowAllowance: isDappActiveOnL2,
    }),
    [
      processApproveTx,
      refetchAllowance,
      allowance,
      isApprovalNeededBeforeUnwrap,
      isDappActiveOnL2,
    ],
  );
};
