import { DatePipe } from '@angular/common';
import { Validators } from '@angular/forms';

export class BusTransferForm {
  depot_id = [null, Validators.required];
  bus_num = ['', Validators.required];
  service_num = ['', Validators.required];
  svc_provider_id = [null, Validators.required];
  day_type = ['', Validators.required];
  est_arrival_time = new DatePipe('en-US').transform(new Date(), 'HH:mm');
  est_arrival_count = [null, Validators.required];
}

export class BusTransferList {
  id = [0, Validators.required];
  depot_id = ['', Validators.required];
  bus_num = ['', [Validators.required, Validators.maxLength(10)]];
  service_num = ['', [Validators.required, Validators.maxLength(4)]];
  svc_prov_id = [sessionStorage.getItem('svdProvId'), Validators.required];
  version = [0, Validators.required];
  day_type = ['', Validators.required];
  // est_arrival_time = new DatePipe('en-US').transform(new Date(), 'HH:mm');
  est_arrival_time = [null, Validators.required]; //for demo
  est_arrival_count = [null, Validators.required];
  updated_on = new DatePipe('en-US').transform(
    new Date(),
    'yyyy-MM-dd HH:mm:ss'
  );
}

export interface IBusTransferList {
    chk: boolean;
  id: number;
  version: number;
  bus_id: string;
  bus_num: string;
  current_depot: string[];
  current_depot_name: string[];
  current_operator: string;
  current_operator_name: string;
  current_effective_date: string;
  future_depot: string[];
  future_depot_name: string[];
  future_operator: string;
  future_operator_name: string;
  status: string;
  future_effective_date: string;
  target_effective_date: string;
  target_effective_time: string;
  status_value?: string;
  original_bus_id?: string;
  depot_row_index?: number;
}
