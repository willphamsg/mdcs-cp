import { commonEnv } from './environment.common';

const env = {
  production: false,
  dagw: false,
  webSocketEnabled: false,
  useDummyData: true,
  useDevSign: false,
  useDynamicEndpoint: true,
  version: '0.0.15',
  ssoUri: 'http://localhost:8025/api/',
  // gateway: 'http://localhost:4000/',
  gateway: 'http://localhost:3000/api/',
};

export const environment = { ...commonEnv, ...env };
