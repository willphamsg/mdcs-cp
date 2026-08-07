import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  DomSanitizer,
  SafeHtml,
  SafeResourceUrl,
} from '@angular/platform-browser';
import { IReportParameter, IReportViewerOption } from '@models/common';
import { ReportService } from '@app/services/report.service';
import { AuthService } from '@app/services/auth.service';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-ssrs-reportviewer',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './ssrs-reportviewer.component.html',
  styleUrl: './ssrs-reportviewer.component.scss',
})
export class SSRSReportViewerComponent
  implements OnInit, OnChanges, OnDestroy
{
  /**
   * SSRS's HTML5 viewer finishes loading its page shell (firing the iframe's
   * native `load` event) well before it finishes rendering the report body.
   * This grace period is kept after `load` fires so the "View Report" button
   * doesn't re-enable while SSRS is still rendering.
   */
  private static readonly REPORT_RENDER_GRACE_MS = 1500;

  sanitizedUrl: SafeResourceUrl | null = null;
  reportHtml: SafeHtml | null = null;

  @Input() parameter: IReportParameter;
  @Input() reportname: string;
  @Input() option: IReportViewerOption;
  @Input() reportType: string;
  @Output() isIframeLoadedEvent = new EventEmitter<boolean>();

  // Report Viewer Parameter
  width: number = 100;
  height: number = 100;

  isIframeLoaded: boolean = false;
  /** True from the moment a report is requested until the render grace period elapses. */
  isReportRendering: boolean = false;

  private readonly destroy$ = new Subject<void>();
  private renderGraceTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly reportService: ReportService,
    private readonly authService: AuthService,
    private readonly http: HttpClient
  ) {}

  ngOnInit(): void {
    // this.loadReport();
    if (
      this.parameter.businessday === null &&
      this.parameter.depotid === null
    ) {
      this.isIframeLoaded = false;
      this.sanitizedUrl = null;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.clearRenderGraceTimeout();

    if (
      (changes['reportname'] || changes['parameter'] || changes['option']) &&
      this.parameter.businessday != 'NaN-NaN-NaN' &&
      this.parameter.depotid != null
    ) {
      this.isReportRendering = true;
      this.loadReport();
      this.isIframeLoaded = true;
    } else {
      this.sanitizedUrl = null;
      this.isIframeLoaded = false;
      this.isReportRendering = false;
    }
  }

  ngOnDestroy(): void {
    this.clearRenderGraceTimeout();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReport() {
    // this.reportHtml = null;
    this.sanitizedUrl = null;

    let Username = 'daily-report';
    if (this.reportType === 'adhoc-report') {
      Username = this.authService.getUsername();
    }

    let spid =
      !this.parameter.spid || this.parameter.spid === 'undefined'
        ? ''
        : '&SPId=' + this.parameter.spid;
    let businessday =
      !this.parameter.businessday ||
      this.parameter.businessday === 'NaN-NaN-NaN'
        ? ''
        : '&BusinessDay=' + this.parameter.businessday;
    let depotid =
      !this.parameter.depotid || this.parameter.depotid === 'undefined'
        ? ''
        : String(this.parameter.depotid)
            .split(',')
            .map(id => '&DepotId=' + id.trim())
            .join('');
    // let user = (!this.parameter.user || this.parameter.user === 'undefined') ? '' : '&User=' + this.parameter.user;
    let month =
      !this.parameter.month || this.parameter.month === 'undefined'
        ? ''
        : '&ReportingMonth=' + this.parameter.month;
    let currenteffectivedatetime =
      !this.parameter.currenteffectivedatetime ||
      this.parameter.currenteffectivedatetime === 'NaN-NaN-NaN'
        ? ''
        : '&CurrentEffectiveDateTime=' +
          this.parameter.currenteffectivedatetime;
    let futureeffectivedatetime =
      !this.parameter.futureeffectivedatetime ||
      this.parameter.futureeffectivedatetime === 'NaN-NaN-NaN'
        ? ''
        : '&FutureEffectiveDateTime=' + this.parameter.futureeffectivedatetime;
    let currentspid =
      !this.parameter.currentspid || this.parameter.currentspid === 'undefined'
        ? ''
        : '&CurrentSPId=' + this.parameter.currentspid;
    let futurespid =
      !this.parameter.futurespid || this.parameter.futurespid === 'undefined'
        ? ''
        : '&FutureSPId=' + this.parameter.futurespid;
    let username =
      !this.authService.getUsername() || this.authService.getUsername() === null
        ? ''
        : '&Username=' + Username;

    let reportFileName = this.reportname;

    let params =
      '&rs:Embed=true&rs:Format=HTML5&rs:Command=Render' +
      '&rc:Toolbar=' +
      this.option.toolbar +
      '&rc:Parameters=' +
      this.option.showparameter +
      spid +
      businessday +
      depotid +
      month +
      currenteffectivedatetime +
      futureeffectivedatetime +
      currentspid +
      futurespid +
      username;

    // SSRS embeds a trusted report URL from our backend; sanitizer bypass is required for iframe. // NOSONAR
    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl( // NOSONAR
      this.reportService.getReportURL(reportFileName, params)
    );
    // this.http
    //   .get('/assets/pdfs/SG2102030707581291754.pdf', {
    //     responseType: 'arraybuffer',
    //   })
    //   .subscribe(pdf => {
    //     const blob = new Blob([pdf], { type: 'application/pdf' });

    //     this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    //       URL.createObjectURL(blob)
    //     );
    //     //  const fileURL = URL.createObjectURL(blob);
    //     // window.open(fileURL);

    //     console.log(this.sanitizedUrl);
    //   });
    // this.reportService.getReportHtml(reportFileName, params)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: (html: string) => {
    //       this.reportHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    //     },
    //     error: (err) => {
    //     }
    //   });
  }

  onIframeLoad(): void {
    this.clearRenderGraceTimeout();
    this.renderGraceTimeout = setTimeout(() => {
      this.isIframeLoaded = true;
      this.isReportRendering = false;
      this.isIframeLoadedEvent.emit(true);
    }, SSRSReportViewerComponent.REPORT_RENDER_GRACE_MS);
  }

  private clearRenderGraceTimeout(): void {
    if (this.renderGraceTimeout !== null) {
      clearTimeout(this.renderGraceTimeout);
      this.renderGraceTimeout = null;
    }
  }

  formatDateOffset(
    currentDate: string,
    type: 'substract' | 'add',
    offsetDay: number
  ): string {
    const date = new Date(currentDate);

    if (type === 'substract')
      date.setDate(date.getDate() - offsetDay); // subtract
    else if (type === 'add') date.setDate(date.getDate() + offsetDay);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  getCurrentTime(): string {
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }
}
