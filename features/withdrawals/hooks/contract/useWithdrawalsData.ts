import { useCallback } from 'react';
import { useLidoSWR } from '@lido-sdk/react';

import { ZERO, useDappStatus, useLidoSDK } from 'modules/web3';

import { STRATEGY_LAZY } from 'consts/swr-strategies';
import { default as dynamics } from 'config/dynamics';

import {
  RequestStatus,
  RequestStatusClaimable,
  RequestStatusPending,
} from 'features/withdrawals/types/request-status';
import { MAX_SHOWN_REQUEST_PER_TYPE } from 'features/withdrawals/withdrawals-constants';

import { standardFetcher } from 'utils/standardFetcher';
import { encodeURLQuery } from 'utils/encodeURLQuery';

export type WithdrawalRequests = NonNullable<
  ReturnType<typeof useWithdrawalRequests>['data']
>;

export type RequestInfoDto = {
  finalizationIn: number;
  finalizationAt: string;
  requestId: string;
  requestedAt: string;
};

export type RequestTimeByRequestIds = {
  requestInfo: RequestInfoDto;
  nextCalculationAt: string;
};

const getRequestTimeForWQRequestIds = async (
  ids: string[],
): Promise<
  {
    id: string;
    finalizationAt: string;
  }[]
> => {
  const idsPages = [];
  const pageSize = 20;

  for (let i = 0; i < ids.length; i += pageSize) {
    idsPages.push(ids.slice(i, i + pageSize));
  }

  const result = [];

  for (const page of idsPages) {
    const basePath = dynamics.wqAPIBasePath;
    const params = encodeURLQuery({ ids: page.toString() });
    const queryString = params ? `?${params}` : '';
    const url = `${basePath}/v2/request-time${queryString}`;
    const requests = await standardFetcher<RequestTimeByRequestIds[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        'WQ-Request-Source': 'widget',
      },
    });

    for (const request of requests) {
      if (!request || !request.requestInfo) continue;
      const modifiedResult = {
        id: request.requestInfo.requestId,
        finalizationAt: request.requestInfo.finalizationAt,
      };

      result.push(modifiedResult);
    }

    if (idsPages.length > 1) {
      // avoid backend spam
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return result;
};

export const useWithdrawalRequests = () => {
  const { withdraw } = useLidoSDK();
  const { chainId, address } = useDappStatus();
  // const { data: currentShareRate } = useLidoShareRate();

  const swr = useLidoSWR(
    // TODO: use this fragment for expected eth calculation
    // currentShareRate
    //   ? ['swr:withdrawals-requests', address, chainId, currentShareRate]
    //   : false,
    ['swr:withdrawals-requests', address, chainId],
    async (...args: unknown[]) => {
      const account = args[1] as `0x${string}`;
      // const currentShareRate = args[3] as BigNumber;

      const [requestIds, lastCheckpointIndex] = await Promise.all([
        withdraw.views
          .getWithdrawalRequestsIds({ account: account })
          .then((ids) => {
            return [...ids].sort((aId, bId) => (aId > bId ? 1 : -1));
          }),
        withdraw.views.getLastCheckpointIndex(),
      ]);

      const STATUS_BATCH_SIZE = 500;
      const requestStatuses = [];

      for (let i = 0; i < requestIds.length; i += STATUS_BATCH_SIZE) {
        const batch = requestIds.slice(i, i + STATUS_BATCH_SIZE);
        const batchStatuses = await withdraw.views.getWithdrawalStatus({
          requestsIds: batch,
        });
        requestStatuses.push(...batchStatuses);
      }

      const claimableRequests: RequestStatus[] = [];
      const pendingRequests: RequestStatusPending[] = [];
      const pendingRequestsIds: string[] = [];

      requestStatuses.forEach((request, index) => {
        if (!request.isFinalized) {
          pendingRequestsIds.push(requestIds[index].toString());
        }
      });

      let wqRequests: { finalizationAt: string; id: string }[] = [];

      try {
        wqRequests = await getRequestTimeForWQRequestIds(pendingRequestsIds);
      } catch (e) {
        console.warn('Failed to fetch request time for requests ids', e);
      }

      let pendingAmountOfStETH = BigInt(0);
      let claimableAmountOfStETH = BigInt(0);

      requestStatuses.forEach((request, index) => {
        const id = requestIds[index];
        const req: RequestStatus = {
          ...request,
          finalizationAt: null,
        };

        if (request.isFinalized && !request.isClaimed) {
          claimableRequests.push(req);
          claimableAmountOfStETH =
            claimableAmountOfStETH + request.amountOfStETH;
        } else if (!request.isFinalized) {
          const r = wqRequests.find((r) => r.id === id.toString());
          pendingRequests.push({
            ...req,
            finalizationAt: r?.finalizationAt ?? null,
            expectedEth: req.amountOfStETH, // TODO: replace with calcExpectedRequestEth(req, currentShareRate),
          });
          pendingAmountOfStETH = pendingAmountOfStETH + request.amountOfStETH;
        }
        return req;
      });

      let isClamped =
        claimableRequests.splice(MAX_SHOWN_REQUEST_PER_TYPE).length > 0;
      isClamped ||=
        pendingRequests.splice(MAX_SHOWN_REQUEST_PER_TYPE).length > 0;

      const hints = await withdraw.views.findCheckpointHints({
        sortedIds: claimableRequests.map(({ id }) => id),
        firstIndex: BigInt(1),
        lastIndex: lastCheckpointIndex,
      });

      const claimableEth = await withdraw.views.getClaimableEther({
        sortedIds: claimableRequests.map(({ id }) => id),
        hints,
      });

      let claimableAmountOfETH = BigInt(0);

      const sortedClaimableRequests: RequestStatusClaimable[] =
        claimableRequests.map((request, index) => {
          claimableAmountOfETH = claimableAmountOfETH + claimableEth[index];
          return {
            ...request,
            hint: hints[index],
            claimableEth: claimableEth[index],
          };
        });

      return {
        pendingRequests,
        sortedClaimableRequests,
        pendingCount: pendingRequests.length,
        readyCount: sortedClaimableRequests.length,
        claimedCount: claimableRequests.length,
        pendingAmountOfStETH,
        claimableAmountOfStETH,
        claimableAmountOfETH,
        isClamped,
      };
    },
    STRATEGY_LAZY,
  );
  const oldData = swr.data;
  const mutate = swr.mutate;

  const optimisticClaimRequests = useCallback(
    async (requests: RequestStatusClaimable[]) => {
      if (!oldData) return undefined;
      const { steth, eth } = requests.reduce(
        (acc, request) => {
          return {
            steth: acc.steth + request.amountOfStETH,
            eth: acc.eth + request.claimableEth,
          };
        },
        { steth: ZERO, eth: ZERO },
      );
      const optimisticData = {
        ...oldData,
        sortedClaimableRequests: oldData.sortedClaimableRequests.filter(
          (r) => requests.includes(r), // this works because they are same object refs
        ),
        readyCount: oldData.readyCount - requests.length,
        claimedCount: oldData.claimedCount + requests.length,
        claimableAmountOfStETH: oldData.claimableAmountOfStETH - steth,
        claimableAmountOfETH: oldData.claimableAmountOfETH - eth,
      };
      return mutate(optimisticData, true);
    },
    [oldData, mutate],
  );

  const revalidate = useCallback(
    () => mutate(oldData, true),
    [oldData, mutate],
  );

  return { ...swr, optimisticClaimRequests, revalidate };
};
