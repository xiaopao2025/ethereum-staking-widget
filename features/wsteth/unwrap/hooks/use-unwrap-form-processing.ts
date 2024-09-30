import { useCallback } from 'react';
import invariant from 'tiny-invariant';
import { useAccount } from 'wagmi';

import {
  useSDK,
  useSTETHContractRPC,
  useWSTETHContractRPC,
  useWSTETHContractWeb3,
} from '@lido-sdk/react';

import { useCurrentStaticRpcProvider } from 'shared/hooks/use-current-static-rpc-provider';
import { isContract } from 'utils/isContract';
import { runWithTransactionLogger } from 'utils';

import type { UnwrapFormInputType } from '../unwrap-form-context';
import { useTxModalStagesUnwrap } from './use-tx-modal-stages-unwrap';
import { sendTx } from 'utils/send-tx';
import { useTxConfirmation } from 'shared/hooks/use-tx-conformation';
import { useUnwrapTxOnL2Approve } from '../../unwrap/hooks/use-unwrap-tx-on-l2-approve';
import { CHAINS, isSDKSupportedL2Chain } from '../../../../consts/chains';
import { useLidoSDK } from '../../../../providers/lido-sdk';

export type UnwrapFormApprovalData = ReturnType<typeof useUnwrapTxOnL2Approve>;

type UseUnwrapFormProcessorArgs = {
  approvalDataOnL2: UnwrapFormApprovalData;
  onConfirm: () => Promise<void>;
  onRetry?: () => void;
};

export const useUnwrapFormProcessor = ({
  // approvalDataOnL2,
  onConfirm,
  onRetry,
}: UseUnwrapFormProcessorArgs) => {
  const { address, chainId } = useAccount();
  const { providerWeb3 } = useSDK();
  const { staticRpcProvider } = useCurrentStaticRpcProvider();
  const { txModalStages } = useTxModalStagesUnwrap();
  const stETHContractRPC = useSTETHContractRPC();
  const wstETHContractRPC = useWSTETHContractRPC();
  const wstethContractWeb3 = useWSTETHContractWeb3();
  const waitForTx = useTxConfirmation();
  const { sdk } = useLidoSDK();

  // const {
  // isApprovalNeededBeforeUnwrap: isApprovalNeededBeforeUnwrapOnL2,
  // processApproveTx: processApproveTxOnL2,
  // } = approvalDataOnL2;

  return useCallback(
    async ({ amount }: UnwrapFormInputType) => {
      try {
        invariant(amount, 'amount should be presented');
        invariant(address, 'address should be presented');
        invariant(providerWeb3, 'providerWeb3 must be presented');
        invariant(wstethContractWeb3, 'must have wstethContractWeb3');

        const [isMultisig, willReceive] = await Promise.all([
          isContract(address, staticRpcProvider),
          wstETHContractRPC.getStETHByWstETH(amount),
        ]);

        // if (isApprovalNeededBeforeUnwrapOnL2) {
        //   txHash = (await processApproveTxOnL2({ amount: amount.toBigInt() })).hash;
        //   .....
        //   txModalStages.signApproval(amount, token);
        //
        //   await processApproveTxOnL1({
        //     onTxSent: (txHash) => {
        //       if (!isMultisig) {
        //         txModalStages.pendingApproval(amount, token, txHash);
        //       }
        //     },
        //   });
        //   if (isMultisig) {
        //     txModalStages.successMultisig();
        //     return true;
        //   }
        // }

        txModalStages.sign(amount, willReceive);

        let txHash: string;
        if (isSDKSupportedL2Chain(chainId as CHAINS)) {
          txHash = (
            await sdk.l2.wrapWstethToSteth({
              value: amount.toBigInt(),
            })
          ).hash;
        } else {
          txHash = await runWithTransactionLogger(
            'Unwrap signing',
            async () => {
              const tx =
                await wstethContractWeb3.populateTransaction.unwrap(amount);

              return sendTx({
                tx,
                isMultisig,
                staticProvider: staticRpcProvider,
                walletProvider: providerWeb3,
              });
            },
          );
        }

        if (isMultisig) {
          txModalStages.successMultisig();
          return true;
        }

        txModalStages.pending(amount, willReceive, txHash);

        await runWithTransactionLogger('Unwrap block confirmation', () =>
          waitForTx(txHash),
        );

        const [stethBalance] = await Promise.all([
          stETHContractRPC.balanceOf(address),
          onConfirm(),
        ]);

        txModalStages.success(stethBalance, txHash);
        return true;
      } catch (error: any) {
        console.warn(error);
        txModalStages.failed(error, onRetry);
        return false;
      }
    },
    [
      sdk.l2,
      address,
      providerWeb3,
      wstethContractWeb3,
      staticRpcProvider,
      wstETHContractRPC,
      txModalStages,
      chainId,
      stETHContractRPC,
      onConfirm,
      waitForTx,
      onRetry,
    ],
  );
};
