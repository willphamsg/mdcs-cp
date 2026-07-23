import { DatePipe } from '@angular/common';
import { Validators } from '@angular/forms';

export class BusForm {
  depot_id = [null, Validators.required];
  bus_num = ['', Validators.required];
  service_num = ['', Validators.required];
  svc_provider_id = [null, Validators.required];
  day_type = ['', Validators.required];
  est_arrival_time = new DatePipe('en-US').transform(new Date(), 'HH:mm');
  est_arrival_count = [null, Validators.required];
}

export class BusList {
  id = [0, Validators.required];
  depot_id = ['', Validators.required];
  bus_num = ['', [Validators.required, Validators.maxLength(7)]];
  // service_num = ['', [Validators.required, Validators.maxLength(4)]];
  // svc_prov_id = [sessionStorage.getItem('svdProvId'), Validators.required];
  // version = [0, Validators.required];
  day_type = ['', Validators.required];
  // est_arrival_time = new DatePipe('en-US').transform(new Date(), 'HH:mm');
  est_arrival_time = [
    null,
    [Validators.required, Validators.max(255), Validators.min(0)],
  ]; //for demo
  est_arrival_count = [null, Validators.required];
  updated_on = new DatePipe('en-US').transform(
    new Date(),
    'yyyy-MM-dd HH:mm:ss'
  );
}

export interface IBustList {
  chk: boolean;
  id: number;
  version: number;
  depot_id: string;
  depot_name?: string;
  bus_num: string;
  service_num: string;
  svc_prov_id: number;
  day_type: string;
  day?: string;
  est_arrival_time: string;
  est_arrival_count: number;
  updated_on: string;
  last_update: string;
}
