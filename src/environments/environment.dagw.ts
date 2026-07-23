import { commonEnv } from './environment.common';

const env = {
  production: false,
  dagw: true,
  webSocketEnabled: true,
  useDummyData: false,
  useDevSign: true,
  useDynamicEndpoint: true,
  ssoUri: 'http://localhost:8025/api/',
  gateway: 'https://localhost:8060/api/',
};

export const environment = { ...commonEnv, ...env };
