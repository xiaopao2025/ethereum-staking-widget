export const PartialStakingRouterAbi = [
  {
    inputs: [
      { internalType: 'address', name: '_depositContract', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'stakingModuleId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'stakingModuleFee',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'treasuryFee',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'setBy',
        type: 'address',
      },
    ],
    name: 'StakingModuleFeesSet',
    type: 'event',
  },
  {
    inputs: [],
    name: 'FEE_PRECISION_POINTS',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'TOTAL_BASIS_POINTS',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getLido',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getStakingFeeAggregateDistribution',
    outputs: [
      { internalType: 'uint96', name: 'modulesFee', type: 'uint96' },
      { internalType: 'uint96', name: 'treasuryFee', type: 'uint96' },
      { internalType: 'uint256', name: 'basePrecision', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getStakingFeeAggregateDistributionE4Precision',
    outputs: [
      { internalType: 'uint16', name: 'modulesFee', type: 'uint16' },
      { internalType: 'uint16', name: 'treasuryFee', type: 'uint16' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getStakingRewardsDistribution',
    outputs: [
      { internalType: 'address[]', name: 'recipients', type: 'address[]' },
      {
        internalType: 'uint256[]',
        name: 'stakingModuleIds',
        type: 'uint256[]',
      },
      { internalType: 'uint96[]', name: 'stakingModuleFees', type: 'uint96[]' },
      { internalType: 'uint96', name: 'totalFee', type: 'uint96' },
      { internalType: 'uint256', name: 'precisionPoints', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalFeeE4Precision',
    outputs: [{ internalType: 'uint16', name: 'totalFee', type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    stateMutability: 'payable',
    type: 'receive',
  },
] as const;
