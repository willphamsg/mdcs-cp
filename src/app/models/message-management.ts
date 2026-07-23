import { IMessageDataFile } from './parameter-management';

// New interfaces for updated API
export interface IMessageDataImportUploadResponse {
  grp_identifier: string;
}

export interface IMessageDataImportSearchRequest {
  grp_identifier: string;
}

export interface IMessageDataImportSearchResponse {
  records_count: number;
  message_data_import: IMessageDataFile[];
}

// New interfaces for export API
export interface IMessageDataExportFile {
  data_file_name: string;
  service_provider_id: number;
  depot_id: number;
  sequence_no: number;
  modified_date_time: string;
  status: string;
  description: string;
}

export interface IMessageDataExportSearchResponse {
  records_count: number;
  message_data_file_export: IMessageDataExportFile[];
}
