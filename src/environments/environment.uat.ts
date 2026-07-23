import { commonEnv } from './environment.common';

const env = {
  production: false,
  dagw: false,
  webSocketEnabled: true,
  useDummyData: false,
  useDevSign: true,
  useDynamicEndpoint: true,
  version: '0.0.16',
  ssoUri: 'http://10.7.1.109:8025/api/',
  gateway: 'https://localhost:8060/api/',
};

export const environment = { ...commonEnv, ...env };