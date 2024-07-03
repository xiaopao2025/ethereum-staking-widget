import { wrapRequest as wrapNextRequest } from '@lidofinance/next-api-wrapper';

import { config } from 'config';
import {
  API_DEFAULT_SUNSET_TIMESTAMP,
  API_ROUTES,
  getReplacementLink,
} from 'consts/api';
import {
  responseTimeMetric,
  errorAndCacheDefaultWrappers,
  rateLimit,
  sunsetBy,
  httpMethodGuard,
  HttpMethod,
} from 'utilsApi';
import Metrics from 'utilsApi/metrics';
import { createEthApiProxy } from 'utilsApi/cached-proxy';

export default wrapNextRequest([
  httpMethodGuard([HttpMethod.GET]),
  rateLimit,
  responseTimeMetric(Metrics.request.apiTimings, API_ROUTES.SMA_STETH_APR),
  sunsetBy({
    sunsetTimestamp: API_DEFAULT_SUNSET_TIMESTAMP,
    replacementLink: getReplacementLink(API_ROUTES.SMA_STETH_APR),
  }),
  ...errorAndCacheDefaultWrappers,
])(
  createEthApiProxy({
    cacheTTL: config.CACHE_SMA_STETH_APR_TTL,
    endpoint: '/v1/protocol/steth/apr/sma',
    ignoreParams: true,
    transformData: (data) => data.data.smaApr.toFixed(1),
  }),
);
