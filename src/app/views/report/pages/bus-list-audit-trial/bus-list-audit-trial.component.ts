import { Component } from '@angular/core';
import { DepotBusinessDayReportBase } from '../shared/depot-business-day-report.base';
import {
  DEPOT_BUSINESS_DAY_REPORT_IMPORTS,
  DEPOT_BUSINESS_DAY_REPORT_PROVIDERS,
} from '../shared/depot-business-day-report.constants';

@Component({
  selector: 'app-bus-list-audit-trial',
  imports: [...DEPOT_BUSINESS_DAY_REPORT_IMPORTS],
  providers: [...DEPOT_BUSINESS_DAY_REPORT_PROVIDERS],
  templateUrl:
    '../shared/depot-business-day-report.component.html',
  styleUrl: '../shared/depot-business-day-report.component.scss',
})
export class BusListAuditTrialComponent extends DepotBusinessDayReportBase {
  readonly reportName = 'BusAuditTrailReport';
  readonly formIdPrefix = 'bus-list-audit-trial';
}
