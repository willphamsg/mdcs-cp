export interface INewParameterApproval {
  chk: boolean;
  id: string | number;
  version: number;
  depot_id: string | number;
  depot_name: string;
  depot?: {
    depot_id: string;
    version: number;
    depot_name: string;
    depot_code: string;
  };
  parameter_name: string;
  parameter_version: string;
  status?: string;
  status_code: number;
  svc_prov_id?: number;
  param_master_id?: number;
  updated_on?: string;
  last_update: string;
  effective_date_time?: string;
}

export interface IParameterMode {
  chk: boolean;
  id: string | number;
  version: number;
  depot_id: string | number;
  depot_name: string;
  depot?: {
    depot_id: string;
    version: number;
    depot_name: string;
    depot_code: string;
  };
  parameter_name: string;
  parameter_version: string;
  status?: string;
  status_code?: number;
  param_master_id?: number;
  svc_prov_id?: number;
  last_update?: string;
  effective_date_time?: string;
  scenario_details?: IValidationScenarioDetails;
}

export interface ITrialDeviceSelection {
  chk: boolean;
  id: string | number;
  depot_id: number | string;
  depot: any;
  bus_num: string;
  svc_provider_id: number;
  trial_group: boolean | string;
  service_group: boolean | string;
  parameter_group: boolean | string;
  last_update?: string;
}

export interface IParameterVersionSummary {
  chk: boolean;
  id: number;
  version: number;
  depot_id: string;
  depot?: {
    depot_id: string;
    version: number;
    depot_name: string;
    depot_code: string;
  };
  file_id: string;
  parameter_name: string;
  parameter_version: string;
  effective_date: string;
  status: string;
}

export interface IEndTrial {
  chk: boolean;
  id: string | number;
  version: number;
  depot_id: string | number;
  depot_name: string;
  depot?: {
    depot_id: string;
    version: number;
    depot_name: string;
    depot_code: string;
  };
  file_id?: string;
  parameter_name: string;
  parameter_version: string;
  effective_date?: string;
  effective_date_time?: string;
  param_master_id?: number;
  svc_prov_id?: number;
  status_code?: number;
  status_desc?: string;
  last_update?: string;
}

export type TUserActionType = 'YES_NO' | 'OK' | 'NONE';

export interface IValidationScenarioDetails {
  scenario_id?: number;
  message?: string;
  user_action_type?: TUserActionType;
}

export interface IValidatedParameterStatus {
  parameter_status: {
    param_master_id?: number;
    depot_id?: number;
    parameter_name?: string;
    parameter_version?: string;
    effective_date_time?: string;
  };
  scenario_details?: IValidationScenarioDetails;
}

export interface IValidateLiveRequest {
  param_master_id: number;
  depot_id: number;
  parameter_name: string;
  parameter_version: string;
  effective_date_time?: string;
}

export interface IParameterModeActionRequest {
  parameter_status: {
    param_master_id?: number;
    depot_id?: number;
    parameter_name?: string;
    parameter_version?: string;
    effective_date_time?: string;
  };
  scenario_reply: {
    acknowledged: boolean;
  };
}
