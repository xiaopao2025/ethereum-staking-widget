import type { Hash } from 'viem';
import styled from 'styled-components';

import { InlineLoader } from '@lidofinance/lido-ui';
import { useTokenAddress } from 'shared/hooks/use-token-address';

import { TxAmount } from '../tx-stages-parts/tx-amount';
import { SuccessText } from '../tx-stages-parts/success-text';
import { TxStageSuccess } from '../tx-stages-basic';

import { TokenToWallet } from '../../components';

export const SkeletonBalance = styled(InlineLoader).attrs({
  color: 'text',
})`
  margin-left: ${({ theme }) => theme.spaceMap.xs}px;
  width: 100px;
`;

export const BalanceContainer = styled('div')`
  display: inline-block;
  white-space: nowrap;
`;

type TxStageOperationSucceedBalanceShownProps = {
  balance?: bigint;
  balanceToken: string;
  operationText: string;
  txHash?: Hash;
  footer?: React.ReactNode;
};

export const TxStageOperationSucceedBalanceShown = ({
  balance,
  balanceToken,
  operationText,
  txHash,
  footer,
}: TxStageOperationSucceedBalanceShownProps) => {
  const tokenToWalletAddress = useTokenAddress(balanceToken);

  const balanceNode = balance ? (
    <TxAmount amount={balance} symbol={balanceToken} />
  ) : (
    <SkeletonBalance />
  );

  return (
    <TxStageSuccess
      txHash={txHash}
      title={
        <>
          Your new balance is <wbr />
          <BalanceContainer>
            {balanceNode}
            <TokenToWallet
              data-testid="txSuccessAddToken"
              address={tokenToWalletAddress}
            />
          </BalanceContainer>
        </>
      }
      description={
        <SuccessText operationText={operationText} txHash={txHash} />
      }
      showEtherscan={false}
      footer={footer}
    />
  );
};
