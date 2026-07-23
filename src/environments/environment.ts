import { commonEnv } from './environment.common';

const env = {
  production: false,
  dagw: false,
  webSocketEnabled: true,
  useDummyData: false,
  useDevSign: true,
  useDynamicEndpoint: false,
  version: '0.0.16',
  ssoUri: 'http://localhost:8025/api/',
  gateway: '/api/',
};

export const environment = { ...commonEnv, ...env };
