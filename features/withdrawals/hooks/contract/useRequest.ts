/* eslint-disable sonarjs/no-identical-functions */
import { useCallback } from 'react';
import invariant from 'tiny-invariant';
import { zeroHash, type Address, type Hash } from 'viem';

import {
  TransactionCallback,
  TransactionCallbackStage,
} from '@lidofinance/lido-ethereum-sdk';

import { TOKENS_TO_WITHDRAWLS } from 'features/withdrawals/types/tokens-withdrawable';
import { useWithdrawals } from 'features/withdrawals/contexts/withdrawals-context';
import { useTxModalStagesRequest } from 'features/withdrawals/request/transaction-modal-request/use-tx-modal-stages-request';
import { useTransactionModal } from 'shared/transaction-modal/transaction-modal';
import {
  useAA,
  useDappStatus,
  useIsMultisig,
  useLidoSDK,
  useSendAACalls,
} from 'modules/web3';

import { useWithdrawalApprove } from './use-withdrawal-approve';

type useWithdrawalRequestParams = {
  amount: bigint | null;
  token: TOKENS_TO_WITHDRAWLS;
  onConfirm?: () => Promise<void>;
  onRetry?: () => void;
};

export const useWithdrawalRequest = ({
  amount,
  token,
  onConfirm,
  onRetry,
}: useWithdrawalRequestParams) => {
  const { address } = useDappStatus();
  const { isAA } = useAA();
  const sendAACalls = useSendAACalls();
  const { isBunker } = useWithdrawals();
  const { withdraw, stETH, wstETH } = useLidoSDK();
  const { txModalStages } = useTxModalStagesRequest();
  const { isMultisig, isLoading: isMultisigLoading } = useIsMultisig();
  const {
    allowance,
    needsApprove,
    isFetching: isUseApproveFetching,
    refetch: refetchAllowance,
  } = useWithdrawalApprove(amount ? amount : 0n, token, address as Address);
  const { closeModal } = useTransactionModal();

  const isApprovalFlow = isMultisig || !!(allowance && !needsApprove);

  const isApprovalFlowLoading =
    isMultisigLoading || (isApprovalFlow && isUseApproveFetching);
  const isTokenLocked = !!(isApprovalFlow && needsApprove);

  const request = useCallback(
    async ({
      requests,
      amount,
      token,
    }: {
      requests: bigint[] | null;
      amount: bigint | null;
      token: TOKENS_TO_WITHDRAWLS;
    }) => {
      invariant(requests && request.length > 0, 'cannot submit empty requests');
      invariant(amount, 'cannot submit empty amount');

      try {
        if (isBunker) {
          const bunkerDialogResult = await txModalStages.dialogBunker();
          if (!bunkerDialogResult) {
            closeModal();
            return false;
          }
        }

        if (isAA) {
          const isSteth = token === 'stETH';
          const requests = withdraw.request.splitAmountToRequests({
            amount,
            token,
          });
          const [wq, tokenContract] = await Promise.all([
            withdraw.contract.getContractWithdrawalQueue(),
            isSteth ? stETH.getContract() : wstETH.getContract(),
          ] as const);
          const calls: unknown[] = [];
          if (needsApprove) {
            calls.push({
              to: tokenContract.address,
              abi: tokenContract.abi,
              functionName: 'approve',
              args: [wq.address, amount] as const,
            });
          }
          calls.push({
            to: wq.address,
            abi: wq.abi,
            functionName: isSteth
              ? 'requestWithdrawals'
              : 'requestWithdrawalsWstETH',
            args: [requests] as const,
          });

          txModalStages.sign(amount, token);
          const callStatus = await sendAACalls(calls, (props) => {
            if (props.stage === 'sent')
              txModalStages.pending(amount, token, props.callId as Hash, isAA);
          });

          void onConfirm?.();
          if (isApprovalFlow) {
            await refetchAllowance();
          }
          // extract last receipt if there was no atomic batch
          const txHash = callStatus.receipts
            ? callStatus.receipts[callStatus.receipts.length - 1]
                .transactionHash
            : zeroHash;

          txModalStages.success(amount, token, txHash);

          return true;
        }

        const txCallbackApproval: TransactionCallback = async ({
          stage,
          payload,
        }) => {
          switch (stage) {
            case TransactionCallbackStage.SIGN:
              txModalStages.signApproval(amount, token);
              break;
            case TransactionCallbackStage.RECEIPT:
              txModalStages.pendingApproval(amount, token, payload);
              break;
            case TransactionCallbackStage.MULTISIG_DONE:
              txModalStages.successMultisig();
              break;
            case TransactionCallbackStage.ERROR:
              txModalStages.failed(payload, onRetry);
              break;
            default:
          }
        };

        let txHash: Hash | undefined = undefined;
        const txCallback: TransactionCallback = async ({ stage, payload }) => {
          switch (stage) {
            case TransactionCallbackStage.PERMIT:
              txModalStages.signPermit();
              break;
            case TransactionCallbackStage.SIGN:
              txModalStages.sign(amount, token);
              break;
            case TransactionCallbackStage.RECEIPT:
              txModalStages.pending(amount, token, payload);
              // the payload here is txHash
              txHash = payload;
              break;
            case TransactionCallbackStage.DONE:
              void onConfirm?.();
              txModalStages.success(amount, token, txHash);
              if (isApprovalFlow) {
                await refetchAllowance();
              }
              break;
            case TransactionCallbackStage.MULTISIG_DONE:
              txModalStages.successMultisig();
              break;
            case TransactionCallbackStage.ERROR:
              txModalStages.failed(payload, onRetry);
              break;
            default:
          }
        };

        const txProps = {
          requests,
          token,
          callback: txCallback,
        };

        if (isApprovalFlow) {
          if (needsApprove) {
            await withdraw.approval.approve({
              amount,
              token,
              callback: txCallbackApproval,
            });
          }

          await withdraw.request.requestWithdrawal(txProps);
        } else {
          await withdraw.request.requestWithdrawalWithPermit(txProps);
        }

        return true;
      } catch (error) {
        console.error(error);
        txModalStages.failed(error, onRetry);
        return false;
      }
    },
    [
      closeModal,
      isAA,
      isApprovalFlow,
      isBunker,
      needsApprove,
      onConfirm,
      onRetry,
      refetchAllowance,
      sendAACalls,
      stETH,
      txModalStages,
      withdraw.approval,
      withdraw.contract,
      withdraw.request,
      wstETH,
    ],
  );

  return {
    isTokenLocked,
    isApprovalFlow,
    allowance,
    isApprovalFlowLoading,
    request,
  };
};
