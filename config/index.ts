import getConfig from 'next/config';
export const { serverRuntimeConfig } = getConfig();
export { default as dynamics } from './dynamics';
export * from './aggregator';
export * from './api';
export * from './cache';
export * from './estimate';
export * from './locale';
export * from './metrics';
export * from './rpc';
export * from './steth';
export * from './storage';
export * from './text';
export * from './tx';
export * from './units';
export * from './metrics';
export * from './rateLimit';
export * from './matomoClickEvents';
