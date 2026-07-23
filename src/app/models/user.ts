import { IDepoList } from './depo';

export interface IUser {
  id: string;
  name: string;
}

export interface ILogin {
  username: string;
  password: string;
}

export class Login implements ILogin {
  username: string = '';
  password: string = '';
  svc_prov_id: string = '';
}

export class DevLogin implements IDevLogin {
  roles: string = '';
  is_lta: boolean = true;
  svc_prov: string = '';
  depots: string = '';
  given_name: string = '';
  user_name: string = '';
  token: string = '';
  audience: string = 'https://localhost:8060';
}

export interface IDevLogin {
  roles: string;
  is_lta: boolean;
  svc_prov: string;
  depots: string;
  given_name: string;
  user_name: string;
  audience: string;
}

export interface ITokenRenewRequest {
  access_token: string;
  refresh_token: string;
}

export interface ITokenRenewResponse {
  access_token: string;
  refresh_token: string;
}

export interface UserProfile {
  access_token_profile: AccessTokenProfile;
  depot_list: IDepoList[];
  svc_prov_list: IServiceProviderInfo;
  version: string;
  roles?: ('adm' | 'sup' | 'ope' | 'mai')[];
}

export interface AccessTokenProfile {
  given_name: string;
  user_name: string;
  trace_id: string;
  svc_prov: number;
  depots: number[];
  roles: string[];
  is_lta: boolean;
}

export interface IServiceProviderInfo {
  svc_prov_id: number;
  svc_prov_code: string;
  svc_prov_name: string;
  id?: number;
  version?: number;
}

export interface IAccessRights {
  roles: string;
  access: IAccess[];
}

export type accessList = { [key: string]: boolean };
export interface IAccess {
  module: string;
  access: accessList;
}
