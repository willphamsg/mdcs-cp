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
import { SSRSReportViewerComponent } from '@components/ssrs-reportviewer/ssrs-reportviewer.component';
import {
  IReportParameter,
  IReportViewerOption,
  IOperatorList,
  DepoRequest,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { DepoService } from '@services/depo.service';
import { combineLatest, Subject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '@app/services/auth.service';
import { DailyReportService } from '@services/daily-report.service';
import { CommonService } from '@app/services/common.service';
import { MessageService } from '@app/services/message.service';
import { DD_MM_YYYY_FORMAT } from '@app/shared/utils/date-time';

@Component({
  selector: 'app-bus-partial-upload',
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
  templateUrl: './bus-partial-upload.component.html',
  styleUrl: './bus-partial-upload.component.scss',
})
export class BusPartialUploadComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  depots: IDepoList[] = [];
  operators: IOperatorList[] = [];
  reportName: string = 'BusPartialUploadReport';

  depotSelected: string = '';
  businessDaySelected: string = '';
  spNameSelected: string = '';

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

  depo: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 100,
    page_index: 0,
    sort_order: [],
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
    private readonly depoService: DepoService,
    private readonly authService: AuthService,
    private readonly dailyReportService: DailyReportService,
    private readonly route: ActivatedRoute,
    private readonly commonService: CommonService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit() {
    // Check if this is an ad-hoc report by checking the route path
    const url = this.route.snapshot.url.join('/');
    this.isAdhocReport = url.includes('adhoc');
    this.subscribeDepot();

    if (this.isAdhocReport) {
      this.loadDepotsAndOperators();
    }
  }

  ngOnDestroy() {
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

  loadDepotsAndOperators(): void {
    forkJoin([
      this.commonService.search(this.depo),
      this.depoService.search(this.depo),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: any) => {
        const resp = this.messageService.MessageResponse(value[0], true);
        if (resp) {
          const source = value[0].payload['svc_prov_info'];
          this.operators = source;
        }
      });
  }

  onViewReport() {
    if (
      !this.depotSelected ||
      (!this.isAdhocReport && !this.businessDaySelected)
    ) {
      console.warn(
        this.isAdhocReport
          ? 'Please select depot before viewing report'
          : 'Please select depot and business day before viewing report'
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
      month: null,
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
      (!this.isAdhocReport && !this.businessDaySelected)
    ) {
      console.warn(
        this.isAdhocReport
          ? 'Please select depot before downloading'
          : 'Please select depot and business day before downloading'
      );
      return;
    }

    const params = {
      report_name: this.reportName,
      business_day: this.isAdhocReport
        ? null
        : this.formatDate(this.businessDaySelected),
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
}
