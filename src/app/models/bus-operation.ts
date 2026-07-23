export interface IBusOperationList {
  chk: boolean;
  id: number;
  version: number;
  depot_id: string;
  bus_num: string;
  service_num: string;
  download_status: string;
  upload_status: string;
  sam_status: string;
  connect_time: string;
  disconnect_time: string;
  conn_status: boolean | number;
}

export interface IBusOperationDelete {
  id: number;
  version: number;
}

export interface IConnectedBusParams {
  depot_ids: number[];
  hours: number;
}
