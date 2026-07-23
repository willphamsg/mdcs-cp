import { Directive, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  DepoRequest,
  IOperatorList,
  IReportParameter,
  IReportViewerOption,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DailyReportService } from '@services/daily-report.service';
import { DepoService } from '@services/depo.service';
import { MessageService } from '@app/services/message.service';
import { Subject, combineLatest, forkJoin, takeUntil } from 'rxjs';

/**
 * Shared logic for depot + business-day SSRS report pages
 * (arrival exception, audit trail, partial upload, daily bus list).
 */
@Directive()
export abstract class DepotBusinessDayReportBase
  implements OnInit, OnDestroy
{
  protected readonly destroy$ = new Subject<void>();
  protected readonly depoService = inject(DepoService);
  protected readonly authService = inject(AuthService);
  protected readonly dailyReportService = inject(DailyReportService);
  protected readonly route = inject(ActivatedRoute);
  protected readonly commonService = inject(CommonService);
  protected readonly messageService = inject(MessageService);

  abstract readonly reportName: string;
  abstract readonly formIdPrefix: string;

  /** When true, operators are loaded on every init (not only ad-hoc). */
  protected readonly loadOperatorsAlways = false;

  depots: IDepoList[] = [];
  operators: IOperatorList[] = [];

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

  isButtonClick = false;
  expandedMenu = false;
  isAdhocReport = false;

  ngOnInit(): void {
    const url = this.route.snapshot.url.join('/');
    this.isAdhocReport = url.includes('adhoc');
    this.subscribeDepot();

    if (this.loadOperatorsAlways || this.isAdhocReport) {
      this.loadDepotsAndOperators();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  subscribeDepot(): void {
    combineLatest([this.depoService.depoList$])
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
          this.operators = value[0].payload['svc_prov_info'];
        }
      });
  }

  onViewReport(): void {
    if (!this.canRunReport()) {
      console.warn(this.missingSelectionMessage('viewing report'));
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

  isIframeLoadedEvent(newValue: boolean): void {
    this.isButtonClick = !newValue;
  }

  formatDate(currentDate: string): string {
    const date = new Date(currentDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  menuHandler(isOpen: boolean): void {
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
    if (!this.canRunReport()) {
      console.warn(this.missingSelectionMessage('downloading'));
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
        next: (blob: Blob) => this.downloadFile(blob, downloadFormat),
        error: error => console.error('Download failed:', error),
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

    const extension = format === 'excel' ? 'xlsx' : format;
    link.download = `${reportNameFormatted}_${currentDate}.${extension}`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private canRunReport(): boolean {
    return Boolean(
      this.depotSelected &&
        (this.isAdhocReport || this.businessDaySelected)
    );
  }

  private missingSelectionMessage(action: string): string {
    return this.isAdhocReport
      ? `Please select depot before ${action}`
      : `Please select depot and business day before ${action}`;
  }
}
