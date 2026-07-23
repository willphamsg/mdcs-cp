import { Validators } from '@angular/forms';
import { IDepoList } from './depo';

export class DepotFileList {
  depot = ['', Validators.required];
  fileName = [{ value: '', disabled: true }];
}

export interface IDepotFileList {
  depot: string;
  fileName: string;
}

export interface IParameterStatus {
  isActive: boolean;
  value: string;
}

export interface IParameterTab {
  label: string;
  id: number;
  tab_code: number;
}

export interface IDagwParameterSummary {
  id: number;
  version: number;
  depot_id: string;
  depot?: {
    depot_id: string;
    version: number;
    depot_name: string;
    depot_code: string;
  };
  parameter_name: string;
  mdcs_live: IParameterStatus;
  dagw1_live?: IParameterStatus;
  dagw2_live?: IParameterStatus;
  mdcs_trial?: IParameterStatus;
  dagw1_trial?: IParameterStatus;
  dagw2_trial?: IParameterStatus;
  effective_date_live: string;
  effective_date_trial: string;
  consistency: string;
}

export interface IParameterDepotItems {
  item_code: string;
  items: IDepoList[];
}

export interface IParameterSubTypeAndFile {
  device_label: string;
  device_type: string;
  device_items: IParameterFileDetails[];
}

export interface IParameterFileDetails {
  label: string;
  item_code: string;
  parameter_view_details: IParameterViewDetails[];
}

export interface IParameterViewDetails {
  id: number;
  parameter_name: string;
  depot_id?: number;
  svc_provider_id?: number;
  is_location_specific?: boolean;
  is_multi_version?: boolean;
  locationSpecific?: boolean;
  multiVersion?: boolean;
  triable?: boolean;
}

export interface IParameterViewerData {
  fileId: string;
  parameter_name: string;
  parameter_version: string;
  format_version: string;
  effective_date_time: string;
  bus_group_list?: number[];
  parameter_payload_id?: number;
}

export interface IParameterPayloadDetails {
  no: number;
  user_staff_id: string;
  mdcs_access: string;
}

export interface IParameterBfcConfig {
  key: string;
  value: string;
}

export interface IParameterList {
  id: number;
  value: string;
}

export interface IParameterFileExportEntity {
  serviceProviderId: number;
  param_depot_id: number;
  param_file_id: string;
  param_file_name: string;
  param_payload_version: string;
  param_type: string;
  description?: string;
  status?: string;
}

export interface IFile {
  id: number;
  depot?: string;
  fileId: string;
  parameterName: string;
  version: string;
  status: string;
  recordsCount?: number;
  param_file_export_entity_pgn?: IParameterFileExportEntity;
  effectiveDateTime?: string;
  type?: string;
  chk?: boolean;
  description?: string;
}

export interface IMessageDataFile {
  id: number;
  message_data_filename: string;
  bus_no: string;
  sequence_no: string;
  status: string;
  description: string;
  creation_date_time?: string;
  modified_date_time?: string;
  no_of_message_data?: string;
  chk?: boolean;
}

export interface IBusCashFare {
  no: number;
  service_category: number;
  adult_idfc_btn: IFareButton;
  child_idfc_btn: IFareButton;
  senior_idfc_btn: IFareButton;
}

export interface IFareButton {
  no_1: number;
  no_2: number;
  no_3: number;
  no_4?: number;
  no_5?: number;
  no_6?: number;
  no_7?: number;
  no_8?: number;
}

export interface IParameterMultipleVersion {
  id: number,
  parameter_name: string,
  depot_id?: number,
  svc_provider_id?: number,
  is_location_specific?: boolean,
  is_multi_version?: boolean,
  locationSpecific?: boolean,
  multiVersion?: boolean,
  triable?: boolean,
}

export interface IParameterJSONData {
  parameter_name: string | null;
  jsondata: string;
  fileId?: number;
}

export class MessageFile {
  businessDate = ['', Validators.required];
  fileName = [{ value: '', disabled: true }];
}

export interface IMessageFile {
  businessDate: string;
  fileName: string;
}