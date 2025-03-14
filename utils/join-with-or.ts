import { type SupportedChainLabels } from 'modules/web3/web3-provider/dapp-chain';

export const joinWithOr = (labels: SupportedChainLabels) => {
  const labelArray = Object.values(labels);
  const copy = [...labelArray];
  const last = copy.pop();
  return [copy.join(', '), last].filter((entry) => entry).join(' or ');
};
