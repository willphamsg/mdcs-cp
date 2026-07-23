import { Component } from '@angular/core';
import { DepotBusinessDayReportBase } from '../shared/depot-business-day-report.base';
import {
  DEPOT_BUSINESS_DAY_REPORT_IMPORTS,
  DEPOT_BUSINESS_DAY_REPORT_PROVIDERS,
} from '../shared/depot-business-day-report.constants';

@Component({
  selector: 'app-daily-bus-list-report',
  imports: [...DEPOT_BUSINESS_DAY_REPORT_IMPORTS],
  providers: [...DEPOT_BUSINESS_DAY_REPORT_PROVIDERS],
  templateUrl:
    '../shared/depot-business-day-report.component.html',
  styleUrl: '../shared/depot-business-day-report.component.scss',
})
export class DailyBusListReportComponent extends DepotBusinessDayReportBase {
  readonly reportName = 'DailyBusListReport';
  readonly formIdPrefix = 'daily-bus-list-report';
  protected override readonly loadOperatorsAlways = true;
}
