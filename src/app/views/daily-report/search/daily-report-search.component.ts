import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatOptionModule,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { SSRSReportViewerComponent } from '@app/components/ssrs-reportviewer/ssrs-reportviewer.component';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import { IReportParameter, IReportViewerOption } from '@models/common';
import { IDepoList } from '@models/depo';
import { TabList } from '@models/tab-list';
import { DepoService } from '@services/depo.service';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { AuthService } from '@app/services/auth.service';
import { DailyReportService } from '@services/daily-report.service';
import { DD_MM_YYYY_FORMAT } from '@app/shared/utils/date-time';

export const tabsKeys = {
  bus_arrival_exception_list: 'bus_arrival_exception_list',
  bus_list_audit_trail: 'bus_list_audit_trail',
  bus_data_transfer: 'bus_data_transfer',
  bus_partial_upload: 'bus_partial_upload',
  daily_bus_list: 'daily_bus_list',
  DAGW_monthly_availability: 'DAGW_monthly_availability',
};

@Component({
  selector: 'app-adhoc-reports',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    MatTableModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    MatOptionModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatTabsModule,
    RouterModule,
    MatCheckboxModule,
    MatSortModule,
    MatMenuModule,
    CommonModule,
    MatDividerModule,
    FormsModule,
    FilterComponent,
    PaginationComponent,
    SelectedFilterComponent,
    SSRSReportViewerComponent,
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  templateUrl: './daily-report-search.component.html',
  styleUrl: './daily-report-search.component.scss',
})
export class DailyReportComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  tabList: TabList[] = [
    {
      key: tabsKeys?.bus_arrival_exception_list,
      title: 'Bus Arrival Exception List',
    },
    {
      key: tabsKeys?.bus_list_audit_trail,
      title: 'Bus List Audit Trail',
    },
    {
      key: tabsKeys?.bus_data_transfer,
      title: 'Bus Data Transfer Details',
    },
    {
      key: tabsKeys?.bus_partial_upload,
      title: 'Bus Partial Upload',
    },
    {
      key: tabsKeys?.daily_bus_list,
      title: 'Daily Bus List',
    },
  ];

  depots: IDepoList[] = [];
  report_type: string = 'bus_arrival_exception_list';

  depotSelected: string = '';
  businessDaySelected: string = '';
  monthSelected: string = '';

  reportName: string = 'BusArrivalExceptionReport';
  parameterReportViewer: IReportParameter = {
    spid: null,
    businessday: null,
    depotid: null,
    month: null,
  };
  optionReportViewer: IReportViewerOption = {
    showparameter: 'false',
    toolbar: 'true',
  };

  todayJS = (() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  })();

  svcProviderID = this.authService.getSVCProvider();

  isButtonClick: boolean = false;
  expandedMenu: boolean = false;

  constructor(
    private readonly depoService: DepoService,
    public readonly dialog: MatDialog,
    private readonly authService: AuthService,
    private readonly dailyReportService: DailyReportService
  ) {}

  ngOnInit() {
    this.subscribeDepot();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  onTabChange(event: MatTabChangeEvent) {
    this.report_type = event.tab.textLabel;

    this.depotSelected = '';
    this.businessDaySelected = '';
    this.parameterReportViewer = {
      spid: this.svcProviderID,
      businessday: null,
      depotid: null,
      month: null,
    };

    this.changeReport(this.report_type);
  }

  changeReport(report_type: string) {
    switch (report_type) {
      case 'bus_arrival_exception_list':
        this.reportName = 'BusArrivalExceptionReport';
        break;
      case 'bus_list_audit_trail':
        this.reportName = 'BusAuditTrailReport';
        break;
      case 'bus_partial_upload':
        this.reportName = 'BusPartialUploadReport';
        break;
      case 'daily_bus_list':
        this.reportName = 'DailyBusListReport';
        break;
      case 'bus_data_transfer':
        this.reportName = 'BusDataTransferReport';
        break;
      default:
        this.reportName = 'BusArrivalExceptionReport';
    }
  }

  subscribeDepot(): void {
    const depotList$ = this.depoService.depoList$;
    combineLatest([depotList$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([depotList]) => {
        this.depots = depotList;
      });
  }

  onViewReport() {
    if (!this.depotSelected || !this.businessDaySelected) {
      console.warn(
        'Please select depot and business day before viewing report'
      );
      return;
    }

    this.isButtonClick = true;

    const params = {
      report_name: this.reportName,
      business_day: this.formatDate(this.businessDaySelected),
      format: 'pdf',
      svc_prov_id: Number.parseInt(this.svcProviderID!, 10),
      depot_id: Number.parseInt(this.depotSelected, 10),
    };

    this.dailyReportService
      .download(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.viewPdfInBrowser(blob);
          this.isButtonClick = false;
        },
        error: error => {
          console.error('View report failed:', error);
          this.isButtonClick = false;
        },
      });
  }

  isIframeLoadedEvent(newValue: boolean) {
    this.isButtonClick = !newValue;
  }

  formatDate(currentDate: string) {
    const date = new Date(currentDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  menuHandler(isOpen: boolean) {
    this.expandedMenu = isOpen;
  }

  exportCSV(): void {
    this.downloadReport('csv');
  }

  exportExcel(): void {
    this.downloadReport('excel');
  }

  print(): void {
    this.downloadReport('pdf');
  }

  downloadReport(downloadFormat: 'pdf' | 'csv' | 'excel'): void {
    if (!this.depotSelected || !this.businessDaySelected) {
      console.warn('Please select depot and business day before downloading');
      return;
    }

    const params = {
      report_name: this.reportName,
      business_day: this.formatDate(this.businessDaySelected),
      format: downloadFormat,
      svc_prov_id: Number.parseInt(this.svcProviderID!, 10),
      depot_id: Number.parseInt(this.depotSelected, 10),
    };

    this.dailyReportService
      .download(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.downloadFile(blob, downloadFormat);
        },
        error: error => {
          console.error('Download failed:', error);
        },
      });
  }

  downloadFile(blob: Blob, format: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const currentDate = new Date().toISOString().split('T')[0];
    const reportNameFormatted = this.reportName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .substring(1);

    let extension = format;
    if (format === 'excel') {
      extension = 'xlsx';
    }

    link.download = `${reportNameFormatted}_${currentDate}.${extension}`;
    link.click();

    window.URL.revokeObjectURL(url);
  }

  viewPdfInBrowser(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');

    // Clean up after a delay to ensure the PDF loads
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }
}
