import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DailyReportService } from '@services/daily-report.service';
import { DepoService } from '@services/depo.service';
import { MessageService } from '@app/services/message.service';
import { IDepoList } from '@models/depo';
import { PayloadResponse } from '@models/common';
import { DepotBusinessDayReportBase } from './depot-business-day-report.base';

@Component({
  selector: 'app-test-report-host',
  template: '',
})
class TestReportHostComponent extends DepotBusinessDayReportBase {
  readonly reportName = 'TestReportName';
  readonly formIdPrefix = 'test-report';
}

@Component({
  selector: 'app-test-report-always-load-host',
  template: '',
})
class TestReportAlwaysLoadHostComponent extends DepotBusinessDayReportBase {
  readonly reportName = 'TestReportName';
  readonly formIdPrefix = 'test-report';
  protected override readonly loadOperatorsAlways = true;
}

describe('DepotBusinessDayReportBase', () => {
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockDailyReportService: jasmine.SpyObj<DailyReportService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const mockDepots: IDepoList[] = [
    { id: 1, version: 1, depot_id: '5', depot_code: 'D5', depot_name: 'Depot Five' },
  ];

  const okResponse = (payload: unknown): PayloadResponse => ({
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'OK',
    payload,
  });

  function buildRoute(urlPath: string): ActivatedRoute {
    return {
      snapshot: { url: [{ toString: () => urlPath }] },
    } as unknown as ActivatedRoute;
  }

  function createFixture<T extends DepotBusinessDayReportBase>(
    hostType: new () => T,
    routeUrlPath: string
  ): ComponentFixture<T> {
    TestBed.configureTestingModule({
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DailyReportService, useValue: mockDailyReportService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ActivatedRoute, useValue: buildRoute(routeUrlPath) },
      ],
    });
    return TestBed.createComponent(hostType);
  }

  beforeEach(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of(mockDepots),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockDailyReportService = jasmine.createSpyObj('DailyReportService', [
      'download',
    ]);
    mockCommonService = jasmine.createSpyObj('CommonService', ['search']);
    mockMessageService = jasmine.createSpyObj('MessageService', [
      'MessageResponse',
    ]);

    mockAuthService.getSVCProvider.and.returnValue('42');
    mockDailyReportService.download.and.returnValue(of(new Blob(['data'])));
    mockCommonService.search.and.returnValue(
      of(
        okResponse({
          svc_prov_info: [
            { id: 1, svc_prov_id: 1, svc_prov_code: 'A', svc_prov_name: 'Op A' },
          ],
        })
      )
    );
    mockDepoService.search.and.returnValue(
      of(okResponse({ depot_info: mockDepots }))
    );
    mockMessageService.MessageResponse.and.returnValue(true);
  });

  describe('ngOnInit / subscribeDepot', () => {
    it('non-adhoc route subscribes to depots but does not load operators when loadOperatorsAlways is false', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;

      fixture.detectChanges();

      expect(component.isAdhocReport).toBeFalse();
      expect(component.depots).toEqual(mockDepots);
      expect(mockCommonService.search).not.toHaveBeenCalled();
      expect(mockDepoService.search).not.toHaveBeenCalled();
    });

    it('adhoc route sets isAdhocReport true and loads depots + operators', () => {
      const fixture = createFixture(TestReportHostComponent, 'adhoc-report');
      const component = fixture.componentInstance;

      fixture.detectChanges();

      expect(component.isAdhocReport).toBeTrue();
      expect(component.depots).toEqual(mockDepots);
      expect(mockCommonService.search).toHaveBeenCalledWith(component.depo);
      expect(mockDepoService.search).toHaveBeenCalledWith(component.depo);
      expect(mockMessageService.MessageResponse).toHaveBeenCalled();
      expect(component.operators).toEqual([
        { id: 1, svc_prov_id: 1, svc_prov_code: 'A', svc_prov_name: 'Op A' },
      ] as never);
    });

    it('loadOperatorsAlways=true loads operators even on a non-adhoc route', () => {
      const fixture = createFixture(
        TestReportAlwaysLoadHostComponent,
        'daily-bus-list-report'
      );
      const component = fixture.componentInstance;

      fixture.detectChanges();

      expect(component.isAdhocReport).toBeFalse();
      expect(mockCommonService.search).toHaveBeenCalledWith(component.depo);
      expect(mockDepoService.search).toHaveBeenCalledWith(component.depo);
    });

    it('loadDepotsAndOperators does not assign operators when MessageResponse reports failure', () => {
      mockMessageService.MessageResponse.and.returnValue(false);
      const fixture = createFixture(TestReportHostComponent, 'adhoc-report');
      const component = fixture.componentInstance;

      fixture.detectChanges();

      expect(component.operators).toEqual([]);
    });
  });

  describe('ngOnDestroy', () => {
    it('emits and completes the destroy$ subject so subscriptions are torn down', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const destroySubject = (component as unknown as { destroy$: { next: jasmine.Func; complete: jasmine.Func } }).destroy$;
      const nextSpy = spyOn(destroySubject, 'next').and.callThrough();
      const completeSpy = spyOn(destroySubject, 'complete').and.callThrough();

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('onViewReport', () => {
    it('logs a warning and does not touch parameterReportViewer when depot/business day are missing', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const warnSpy = spyOn(console, 'warn');

      component.onViewReport();

      expect(warnSpy).toHaveBeenCalledWith(
        'Please select depot and business day before viewing report'
      );
      expect(component.isButtonClick).toBeFalse();
      expect(component.parameterReportViewer.spid).toBeNull();
    });

    it('builds parameterReportViewer for a non-adhoc report once depot and business day are selected', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      component.depotSelected = '5';
      component.businessDaySelected = '2026-03-15T12:00:00';

      component.onViewReport();

      expect(component.isButtonClick).toBeTrue();
      expect(component.parameterReportViewer).toEqual({
        spid: '42',
        businessday: component.formatDate('2026-03-15T12:00:00'),
        depotid: '5',
        month: null,
      });
    });

    it('builds parameterReportViewer with a null businessday for an adhoc report', () => {
      const fixture = createFixture(TestReportHostComponent, 'adhoc-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      component.depotSelected = '5';

      component.onViewReport();

      expect(component.isButtonClick).toBeTrue();
      expect(component.parameterReportViewer.businessday).toBeNull();
      expect(component.parameterReportViewer.depotid).toBe('5');
    });

    it('logs the adhoc-specific warning when depot is missing on an adhoc report', () => {
      const fixture = createFixture(TestReportHostComponent, 'adhoc-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const warnSpy = spyOn(console, 'warn');

      component.onViewReport();

      expect(warnSpy).toHaveBeenCalledWith(
        'Please select depot before viewing report'
      );
    });
  });

  describe('isIframeLoadedEvent', () => {
    it('sets isButtonClick to the negation of the emitted value', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.isIframeLoadedEvent(true);
      expect(component.isButtonClick).toBeFalse();

      component.isIframeLoadedEvent(false);
      expect(component.isButtonClick).toBeTrue();
    });
  });

  describe('formatDate', () => {
    it('formats an arbitrary date string as YYYY-MM-DD', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.formatDate('2026-03-15T12:00:00')).toBe('2026-03-15');
      expect(component.formatDate('2026-01-09T12:00:00')).toBe('2026-01-09');
    });
  });

  describe('menuHandler', () => {
    it('sets expandedMenu to the given value', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.menuHandler(true);
      expect(component.expandedMenu).toBeTrue();

      component.menuHandler(false);
      expect(component.expandedMenu).toBeFalse();
    });
  });

  describe('exportCSV / exportExcel / print', () => {
    it('delegate to downloadReport with the matching format', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const downloadReportSpy = spyOn(component, 'downloadReport');

      component.exportCSV();
      component.exportExcel();
      component.print();

      expect(downloadReportSpy.calls.allArgs()).toEqual([
        ['csv'],
        ['excel'],
        ['pdf'],
      ]);
    });
  });

  describe('downloadReport', () => {
    it('logs a warning and does not call dailyReportService.download when selection is missing', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const warnSpy = spyOn(console, 'warn');

      component.downloadReport('csv');

      expect(warnSpy).toHaveBeenCalledWith(
        'Please select depot and business day before downloading'
      );
      expect(mockDailyReportService.download).not.toHaveBeenCalled();
    });

    it('calls dailyReportService.download with the built params and forwards the blob to downloadFile', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      component.depotSelected = '7';
      component.businessDaySelected = '2026-03-15T12:00:00';
      const downloadFileSpy = spyOn(component, 'downloadFile');

      component.downloadReport('excel');

      expect(mockDailyReportService.download).toHaveBeenCalledWith({
        report_name: component.reportName,
        business_day: component.formatDate('2026-03-15T12:00:00'),
        format: 'excel',
        svc_prov_id: 42,
        depot_id: 7,
      });
      expect(downloadFileSpy).toHaveBeenCalled();
      const [blobArg, formatArg] = downloadFileSpy.calls.mostRecent().args;
      expect(blobArg instanceof Blob).toBeTrue();
      expect(formatArg).toBe('excel');
    });

    it('sends a null business_day for an adhoc report download', () => {
      const fixture = createFixture(TestReportHostComponent, 'adhoc-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      component.depotSelected = '7';

      component.downloadReport('pdf');

      expect(mockDailyReportService.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ business_day: null })
      );
    });

    it('logs the download error when the service errors', () => {
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      mockDailyReportService.download.and.returnValue(
        throwError(() => new Error('boom'))
      );
      const errorSpy = spyOn(console, 'error');
      component.depotSelected = '7';
      component.businessDaySelected = '2026-03-15T12:00:00';

      component.downloadReport('pdf');

      expect(errorSpy).toHaveBeenCalledWith('Download failed:', jasmine.any(Error));
    });
  });

  describe('downloadFile', () => {
    let component: TestReportHostComponent;
    let createObjectURLSpy: jasmine.Spy;
    let revokeObjectURLSpy: jasmine.Spy;
    let mockLink: { href: string; download: string; click: jasmine.Spy };

    beforeEach(() => {
      // Create the fixture (and let Angular render the real host element)
      // BEFORE stubbing document.createElement, otherwise TestBed's own
      // root-element creation would be captured by the stub too.
      const fixture = createFixture(TestReportHostComponent, 'daily-bus-list-report');
      component = fixture.componentInstance;
      fixture.detectChanges();

      createObjectURLSpy = spyOn(window.URL, 'createObjectURL').and.returnValue(
        'blob:mock-url'
      );
      revokeObjectURLSpy = spyOn(window.URL, 'revokeObjectURL');
      mockLink = { href: '', download: '', click: jasmine.createSpy('click') };
      const realCreateElement = document.createElement.bind(document);
      spyOn(document, 'createElement').and.callFake((tagName: string) =>
        tagName === 'a' ? (mockLink as unknown as HTMLAnchorElement) : realCreateElement(tagName)
      );
    });

    it('creates an object URL, sets link attributes, clicks the link, and revokes the URL', () => {
      const blob = new Blob(['data']);

      component.downloadFile(blob, 'csv');

      expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toMatch(/^test_report_name_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(mockLink.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('maps the excel format to an xlsx file extension', () => {
      const blob = new Blob(['data']);

      component.downloadFile(blob, 'excel');

      expect(mockLink.download).toMatch(/^test_report_name_\d{4}-\d{2}-\d{2}\.xlsx$/);
    });

    it('keeps the pdf extension as-is', () => {
      const blob = new Blob(['data']);

      component.downloadFile(blob, 'pdf');

      expect(mockLink.download).toMatch(/^test_report_name_\d{4}-\d{2}-\d{2}\.pdf$/);
    });
  });
});
