import { commonEnv } from './environment.common';

const env = {
  production: false,
  dagw: false,
  webSocketEnabled: true,
  useDummyData: true,
  useDevSign: false,
  useDynamicEndpoint: true,
  version: '0.0.15',
  ssoUri: 'http://localhost:8025/api/',
  // gateway: 'http://localhost:4000/',
  gateway: 'http://localhost:3000/api/',
  wsUrl: 'http://localhost:3001/ws/connect',
};

export const environment = { ...commonEnv, ...env };
