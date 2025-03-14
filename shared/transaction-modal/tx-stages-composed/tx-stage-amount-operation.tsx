import type { Hash } from 'viem';
import { TxStageSign } from '../tx-stages-basic/tx-stage-sign';
import { TxStagePending } from '../tx-stages-basic/tx-stage-pending';
import { TxAmount } from '../tx-stages-parts/tx-amount';

type TxStageSignOperationAmountProps = {
  amount: bigint;
  token: string;
  operationText: string;
  willReceive?: bigint;
  willReceiveToken?: string;
  isPending?: boolean;
  txHash?: Hash;
  isAA?: boolean;
};

export const TxStageSignOperationAmount = ({
  amount,
  token,
  willReceive,
  willReceiveToken,
  operationText,
  isPending,
  txHash,
  isAA,
}: TxStageSignOperationAmountProps) => {
  const amountEl = <TxAmount amount={amount} symbol={token} />;
  const willReceiveEl = willReceive && willReceiveToken && (
    <TxAmount amount={willReceive} symbol={willReceiveToken} />
  );
  const Component = isPending ? TxStagePending : TxStageSign;

  return (
    <Component
      isAA={isAA}
      txHash={txHash}
      title={
        <>
          You are {operationText.toLowerCase()} {amountEl}
        </>
      }
      description={
        !isPending && (
          <>
            {operationText} {amountEl}.{' '}
            {willReceiveEl && (
              <>
                <br />
                You will receive {willReceiveEl}.
              </>
            )}
          </>
        )
      }
    />
  );
};
