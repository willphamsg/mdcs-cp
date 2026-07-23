export interface IBustExpList {
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
  bus_num: string;
  service_num: string;
  svc_prov_id: number;
  exp_arrival_count: number;
  act_arrival_time: string;
  act_arrival_count: number;
  deficient_return: number;
}
