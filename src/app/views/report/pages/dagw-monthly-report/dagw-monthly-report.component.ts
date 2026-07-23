import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatOptionModule,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { SSRSReportViewerComponent } from '@app/components/ssrs-reportviewer/ssrs-reportviewer.component';
import { IReportParameter, IReportViewerOption } from '@models/common';
import { IDepoList } from '@app/models/depo';
import { DepoService } from '@services/depo.service';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { AuthService } from '@app/services/auth.service';
import { DailyReportService } from '@services/daily-report.service';
import { DD_MM_YYYY_FORMAT } from '@app/shared/utils/date-time';

export interface MonthList {
  month_name: string;
  month_value: string;
}

@Component({
  selector: 'app-dagw-monthly-report',
  imports: [
    MatTableModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    MatOptionModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    FormsModule,
    SelectedFilterComponent,
    SSRSReportViewerComponent,
    RouterModule,
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  templateUrl: './dagw-monthly-report.component.html',
  styleUrl: './dagw-monthly-report.component.scss',
})
export class DagwMonthlyReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  depots: IDepoList[] = [];
  months: MonthList[] = [];
  reportName: string = 'DAGWMontlyAvailability';

  depotSelected: string = '';
  monthSelected: string = '';
  businessDaySelected: string = '';

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
  isAdhocReport: boolean = false;

  constructor(
    private depoService: DepoService,
    private authService: AuthService,
    private dailyReportService: DailyReportService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const url = this.route.snapshot.url.join('/');
    this.isAdhocReport = url.includes('adhoc');
    this.subscribeDepot();
    this.months = this.getMonthValue(new Date());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  subscribeDepot(): void {
    const depotList$ = this.depoService.depoList$;
    combineLatest([depotList$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([depotList]) => {
        this.depots = depotList;
      });
  }

  getMonthValue(month: Date): MonthList[] {
    const months: MonthList[] = [];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    for (let i = 0; i <= 2; i++) {
      const targetDate = new Date(month.getFullYear(), month.getMonth() - i, 1);
      const monthIndex = targetDate.getMonth();
      const year = targetDate.getFullYear();
      months.push({
        month_name: monthNames[monthIndex] + ' ' + year,
        month_value: i.toString(),
      });
    }
    return months;
  }

  onViewReport() {
    if (
      !this.depotSelected ||
      !this.monthSelected ||
      (!this.isAdhocReport && !this.businessDaySelected)
    ) {
      console.warn(
        this.isAdhocReport
          ? 'Please select depot and month before viewing report'
          : 'Please select depot, month, and business day before viewing report'
      );
      return;
    }

    this.isButtonClick = true;

    this.parameterReportViewer = {
      spid: this.svcProviderID,
      businessday: this.isAdhocReport
        ? null
        : this.formatDate(this.businessDaySelected),
      depotid: this.depotSelected,
      month: this.monthSelected,
    };
  }

  isIframeLoadedEvent(newValue: boolean) {
    this.isButtonClick = !newValue;
  }

  formatDate(currentDate: string) {
    const date = new Date(currentDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
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
    if (
      !this.depotSelected ||
      !this.monthSelected ||
      (!this.isAdhocReport && !this.businessDaySelected)
    ) {
      console.warn(
        this.isAdhocReport
          ? 'Please select depot and month before downloading'
          : 'Please select depot, month, and business day before downloading'
      );
      return;
    }

    const params = {
      report_name: this.reportName,
      business_day: this.isAdhocReport
        ? null
        : this.formatDate(this.businessDaySelected),
      format: downloadFormat,
      svc_prov_id: parseInt(this.svcProviderID!),
      depot_id: parseInt(this.depotSelected),
      month: this.monthSelected,
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
}
