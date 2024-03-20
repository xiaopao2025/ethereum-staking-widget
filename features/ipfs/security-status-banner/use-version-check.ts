import { useEffect, useState } from 'react';
import { useLidoSWR } from '@lido-sdk/react';
import { useWeb3 } from 'reef-knot/web3-react';
import { useForceDisconnect } from 'reef-knot/core-react';

import { BASE_PATH_ASSET, dynamics } from 'config';
import { STRATEGY_IMMUTABLE } from 'utils/swrStrategies';
import { useClientConfig } from 'providers/client-config';
import { overrideWithQAMockBoolean } from 'utils/qa';

import { isVersionLess } from './utils';

import buildInfo from 'build-info.json';
import { useRemoteVersion } from './use-remote-version';

export const NO_SAFE_VERSION = 'NONE_AVAILABLE';

// works with any type of IPFS hash
const URL_CID_REGEX =
  /[/.](?<cid>Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,})([./#?]|$)/;

export const useVersionCheck = () => {
  const { active } = useWeb3();
  const { setIsWalletConnectionAllowed } = useClientConfig();
  const { forceDisconnect } = useForceDisconnect();
  const [areConditionsAccepted, setConditionsAccepted] = useState(false);

  // local cid extraction
  const currentCidSWR = useLidoSWR(
    ['swr:ipfs-cid-extraction'],
    async () => {
      const urlCid = URL_CID_REGEX.exec(window.location.href)?.groups?.cid;
      if (urlCid) return urlCid;
      const headers = await fetch(`${BASE_PATH_ASSET}/runtime/window-env.js`, {
        method: 'HEAD',
      });
      return headers.headers.get('X-Ipfs-Roots');
    },
    { ...STRATEGY_IMMUTABLE, isPaused: () => !dynamics.ipfsMode },
  );

  // ens cid extraction
  const remoteVersionSWR = useRemoteVersion();

  const isUpdateAvailable = overrideWithQAMockBoolean(
    Boolean(
      remoteVersionSWR.data &&
        currentCidSWR.data &&
        remoteVersionSWR.data.cid !== currentCidSWR.data &&
        remoteVersionSWR.data.leastSafeVersion !== NO_SAFE_VERSION,
    ),
    'mock-qa-helpers-security-banner-is-update-available',
  );

  const isVersionUnsafe = overrideWithQAMockBoolean(
    Boolean(
      remoteVersionSWR.data?.leastSafeVersion &&
        (remoteVersionSWR.data.leastSafeVersion === NO_SAFE_VERSION ||
          isVersionLess(
            buildInfo.version,
            remoteVersionSWR.data.leastSafeVersion,
          )),
    ),
    'mock-qa-helpers-security-banner-is-version-unsafe',
  );

  const isNotVerifiable = overrideWithQAMockBoolean(
    !!remoteVersionSWR.error,
    'mock-qa-helpers-security-banner-is-not-verifiable',
  );

  // disconnect wallet and disallow connection for unsafe versions
  useEffect(() => {
    if (isVersionUnsafe) {
      setIsWalletConnectionAllowed(false);
    }
    if (isVersionUnsafe || (dynamics.ipfsMode && isNotVerifiable)) {
      forceDisconnect();
    }
  }, [
    active,
    forceDisconnect,
    isNotVerifiable,
    isVersionUnsafe,
    setIsWalletConnectionAllowed,
  ]);

  return {
    setConditionsAccepted,
    areConditionsAccepted,
    isNotVerifiable,
    isVersionUnsafe,
    isUpdateAvailable,

    get data() {
      return {
        remoteCid: remoteVersionSWR.data?.cid,
        currentCid: currentCidSWR.data,
        remoteCidLink: remoteVersionSWR.data?.link,
      };
    },
    get initialLoading() {
      return remoteVersionSWR.initialLoading || currentCidSWR.initialLoading;
    },
    get loading() {
      return remoteVersionSWR.loading || currentCidSWR.loading;
    },
    get error() {
      return remoteVersionSWR.error || currentCidSWR.error;
    },
  };
};
