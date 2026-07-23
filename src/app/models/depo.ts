import { IServiceProviderInfo } from './user';

export interface IDepoList {
  id: number;
  version: number;
  depot_id: string;
  depot_code: string;
  depot_name: string;
  svc_provider?: IServiceProviderInfo;
  value?: string;
}
