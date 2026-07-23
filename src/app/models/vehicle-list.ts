import { Validators } from '@angular/forms';

export interface IVehicleList {
  chk: boolean;
  id: number;
  master_bus_depot_id?: number;
  version: number;
  depot_id: string;
  depot_name: string;
  bus_num: string;
  effective_date: string;
  status: string;
  svc_prov_id: number;
  updated_on: string;
  group_num: number;
  effective_time: string;
  hidden: boolean;
}

export interface IVehicleDelete {
  id: number;
  version: number;
  depot_id: number;
  svc_prov_id?: number;
  bus_num?: string;
}

export class VehicleList {
  id = [0, Validators.required];
  // version = [0, Validators.required];
  bus_num = [
    '',
    [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(8),
      Validators.pattern(/^[a-zA-Z]{2,3}\d{4}[a-zA-Z]?$/),
    ],
  ];
  // svc_prov_id = [sessionStorage.getItem('svdProvId'), Validators.required];
  effective_date = ['', Validators.required];
  effective_time = ['', Validators.required];
  // updated_on = new DatePipe('en-US').transform(
  //   new Date(),
  //   'yyyy-MM-dd HH:mm:ss'
  // );
  depot_id = ['', Validators.required];
  // status = ['', Validators.required];
  hidden = false;
  // group_num = [1, Validators.required];
}

export interface VehicleInfo {
  depot_id: number;
  bus_num: string;
  svc_prov_id: number;
  effective_date: string;
  effective_time: string;
  updated_on: string;
  group_num: number;
}

export enum VehicleStatusEnum {
  'Future Dated' = 'future_dated',
  Inactive = 'inactive',
  Active = 'active',
  'Obsolete' = 'obsolete',
}

export const VehicleStatusLabelMapping: Record<VehicleStatusEnum, string> = {
  [VehicleStatusEnum['Future Dated']]: 'Future Dated',
  [VehicleStatusEnum['Active']]: 'Active',
  [VehicleStatusEnum['Inactive']]: 'Inactive',
  [VehicleStatusEnum['Obsolete']]: 'Obsolete',
};
