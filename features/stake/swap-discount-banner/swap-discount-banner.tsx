import { FC } from 'react';

import { Button } from '@lidofinance/lido-ui';
import { trackEvent } from '@lidofinance/analytics-matomo';

import { MATOMO_CLICK_EVENTS } from 'config';
import { OPEN_OCEAN_REFERRAL_ADDRESS } from 'config/external-links';
import { STRATEGY_LAZY } from 'utils/swrStrategies';
import { getOpenOceanRate } from 'utils/get-open-ocean-rate';
import { parseEther } from '@ethersproject/units';
import { TOKENS } from '@lido-sdk/constants';
import { useLidoSWR } from '@lido-sdk/react';
import { enableQaHelpers } from 'utils';

import { Wrap, TextWrap, OpenOceanIcon } from './styles';

const SWAP_URL = `https://app.openocean.finance/classic?referrer=${OPEN_OCEAN_REFERRAL_ADDRESS}#/ETH/ETH/STETH`;
const DISCOUNT_THRESHOLD = 0.996;
const DEFAULT_AMOUNT = parseEther('1');
const MOCK_LS_KEY = 'mock-qa-helpers-discount-rate';

type FetchRateResult = {
  rate: number;
  shouldShowDiscount: boolean;
  discountPercent: number;
};

const fetchRate = async (): Promise<FetchRateResult> => {
  const { rate } = await getOpenOceanRate(DEFAULT_AMOUNT, 'ETH', TOKENS.STETH);
  return {
    rate,
    shouldShowDiscount: rate <= DISCOUNT_THRESHOLD,
    discountPercent: (1 - rate) * 100,
  };
};

const linkClickHandler = () =>
  trackEvent(...MATOMO_CLICK_EVENTS.openOceanDiscount);

if (enableQaHelpers && typeof window !== 'undefined') {
  (window as any).setMockDiscountRate = (rate?: number) =>
    rate === undefined
      ? localStorage.removeItem(MOCK_LS_KEY)
      : localStorage.setItem(MOCK_LS_KEY, rate.toString());
}

const getData = (data: FetchRateResult | undefined) => {
  if (!enableQaHelpers || typeof window == 'undefined') return data;
  const mock = localStorage.getItem(MOCK_LS_KEY);
  if (mock) {
    const mockRate = parseFloat(mock);
    return {
      rate: mockRate,
      shouldShowDiscount: mockRate < DISCOUNT_THRESHOLD,
      discountPercent: (1 - mockRate) * 100,
    };
  }
  return data;
};

export const SwapDiscountBanner: FC<React.PropsWithChildren> = ({
  children,
}) => {
  const swr = useLidoSWR<FetchRateResult>(
    ['swr:open-ocean-rate'],
    fetchRate,
    STRATEGY_LAZY,
  );

  const data = getData(swr.data);

  if (swr.initialLoading) return null;

  if (!data?.shouldShowDiscount) return children;

  return (
    <Wrap>
      <OpenOceanIcon />
      <TextWrap>
        Get a <b>{data?.discountPercent.toFixed(2)}% discount</b> by swapping to
        stETH&nbsp;on the OpenOcean platform
      </TextWrap>
      <a
        target="_blank"
        rel="noreferrer"
        href={SWAP_URL}
        onClick={linkClickHandler}
      >
        <Button fullwidth size="xs">
          Get discount
        </Button>
      </a>
    </Wrap>
  );
};
