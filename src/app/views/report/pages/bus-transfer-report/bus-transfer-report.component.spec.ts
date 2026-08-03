import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IDepoList } from '@app/models/depo';
import { PayloadResponse } from '@app/models/common';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { DailyReportService } from '@app/services/daily-report.service';
import { MessageService } from '@app/services/message.service';
import DummyData from '@data/db.json';
import { of, throwError } from 'rxjs';
import { BusTransferReportComponent } from './bus-transfer-report.component';

describe('BusTransferReportComponent', () => {
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockDailyReportService: jasmine.SpyObj<DailyReportService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;

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

  function createFixture(routePath: string): ComponentFixture<BusTransferReportComponent> {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DailyReportService, useValue: mockDailyReportService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ActivatedRoute, useValue: buildRoute(routePath) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).overrideComponent(BusTransferReportComponent, {
      set: { template: '<div></div>' },
    });
    return TestBed.createComponent(BusTransferReportComponent);
  }

  beforeEach(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of(mockDepots),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockDailyReportService = jasmine.createSpyObj('DailyReportService', ['download']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['search']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['MessageResponse']);

    mockAuthService.getSVCProvider.and.returnValue('1');
    mockDailyReportService.download.and.returnValue(of(new Blob()));
    mockCommonService.search.and.returnValue(
      of(okResponse({ svc_prov_info: [{ id: 1, svc_prov_id: 1, svc_prov_code: 'A', svc_prov_name: 'Op A' }] }))
    );
    mockMessageService.MessageResponse.and.returnValue(true);
    mockDepoService.search.and.returnValue(of(okResponse({ depot_info: mockDepots })));
  });

  describe('ngOnInit / subscribeDepot / loadDepotsAndOperators', () => {
    it('should create', () => {
      const fixture = createFixture('daily-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should initialize the form and load selections on ngOnInit for a non-adhoc route', () => {
      const fixture = createFixture('daily-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.depots).toEqual(mockDepots);
      expect(component.isAdhocReport).toBeFalse();
      expect(component.reportName).toBe('BusDataTransferReport');
      expect(mockCommonService.search).not.toHaveBeenCalled();
    });

    it('should set isAdhocReport true and load depots + operators on an adhoc route', () => {
      const fixture = createFixture('adhoc-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.isAdhocReport).toBeTrue();
      expect(component.reportName).toBe('BusTransferReport');
      expect(mockCommonService.search).toHaveBeenCalledWith(component.depo);
      expect(mockDepoService.search).toHaveBeenCalledWith(component.depo);
      expect(component.operators).toEqual([
        { id: 1, svc_prov_id: 1, svc_prov_code: 'A', svc_prov_name: 'Op A' },
      ] as never);
    });

    it('should not assign operators when MessageResponse reports failure', () => {
      mockMessageService.MessageResponse.and.returnValue(false);
      const fixture = createFixture('adhoc-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.operators).toEqual([]);
    });
  });

  describe('ngOnDestroy', () => {
    it('should emit and complete the destroy subject', () => {
      const fixture = createFixture('daily-report');
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
    it('should warn and not proceed for a non-adhoc report missing depot/business day', () => {
      const fixture = createFixture('daily-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const warnSpy = spyOn(console, 'warn');

      component.onViewReport();

      expect(warnSpy).toHaveBeenCalledWith(
        'Please select depot and business day before viewing report'
      );
      expect(component.isButtonClick).toBeFalse();
    });

    it('should warn with the adhoc-specific message when depot is missing on an adhoc report', () => {
      const fixture = createFixture('adhoc-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const warnSpy = spyOn(console, 'warn');

      component.onViewReport();

      expect(warnSpy).toHaveBeenCalledWith('Please select depot before viewing report');
    });

    it('should build parameterReportViewer for a non-adhoc report', () => {
      const fixture = createFixture('daily-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      component.depotSelected = '5';
      component.businessDaySelected = '2026-03-15T12:00:00';

      component.onViewReport();

      expect(component.isButtonClick).toBeTrue();
      expect(component.parameterReportViewer.businessday).toBe(
        component.formatDate('2026-03-15T12:00:00')
      );
      expect(component.parameterReportViewer.currenteffectivedatetime).toBeNull();
      expect(component.parameterReportViewer.currentspid).toBeNull();
    });

    it('should build parameterReportViewer for an adhoc report with dates and operators selected', () => {
      const fixture = createFixture('adhoc-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      component.depotSelected = '5';
      component.startDateSelected = '2026-03-01T00:00:00';
      component.endDateSelected = '2026-03-31T00:00:00';
      component.currentOperatorSelected = 'op1';
      component.futureOperatorSelected = 'op2';

      component.onViewReport();

      expect(component.parameterReportViewer.businessday).toBeNull();
      expect(component.parameterReportViewer.currenteffectivedatetime).toBe(
        component.formatDate('2026-03-01T00:00:00')
      );
      expect(component.parameterReportViewer.futureeffectivedatetime).toBe(
        component.formatDate('2026-03-31T00:00:00')
      );
      expect(component.parameterReportViewer.currentspid).toBe('op1');
      expect(component.parameterReportViewer.futurespid).toBe('op2');
    });

    it('should default currenteffectivedatetime/futureeffectivedatetime/currentspid/futurespid to null when unset on an adhoc report', () => {
      const fixture = createFixture('adhoc-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      component.depotSelected = '5';

      component.onViewReport();

      expect(component.parameterReportViewer.currenteffectivedatetime).toBeNull();
      expect(component.parameterReportViewer.futureeffectivedatetime).toBeNull();
      expect(component.parameterReportViewer.currentspid).toBeNull();
      expect(component.parameterReportViewer.futurespid).toBeNull();
    });
  });

  describe('isIframeLoadedEvent', () => {
    it('should set isButtonClick to the negation of the emitted value', () => {
      const fixture = createFixture('daily-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.isIframeLoadedEvent(true);
      expect(component.isButtonClick).toBeFalse();

      component.isIframeLoadedEvent(false);
      expect(component.isButtonClick).toBeTrue();
    });
  });

  describe('formatDate', () => {
    it('should format a date string as YYYY-MM-DD', () => {
      const fixture = createFixture('daily-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.formatDate('2026-03-05T10:00:00')).toBe('2026-03-05');
    });
  });

  describe('menuHandler', () => {
    it('should set expandedMenu to the given value', () => {
      const fixture = createFixture('daily-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.menuHandler(true);
      expect(component.expandedMenu).toBeTrue();

      component.menuHandler(false);
      expect(component.expandedMenu).toBeFalse();
    });
  });

  describe('exportCSV / exportExcel / print', () => {
    it('should delegate to downloadReport with the matching format', () => {
      const fixture = createFixture('daily-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const downloadReportSpy = spyOn(component, 'downloadReport');

      component.exportCSV();
      component.exportExcel();
      component.print();

      expect(downloadReportSpy.calls.allArgs()).toEqual([['csv'], ['excel'], ['pdf']]);
    });
  });

  describe('downloadReport', () => {
    it('should warn and not call download when selection is missing (non-adhoc)', () => {
      const fixture = createFixture('daily-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const warnSpy = spyOn(console, 'warn');

      component.downloadReport('csv');

      expect(warnSpy).toHaveBeenCalledWith(
        'Please select depot and business day before downloading'
      );
      expect(mockDailyReportService.download).not.toHaveBeenCalled();
    });

    it('should warn with adhoc-specific message when depot is missing on an adhoc report', () => {
      const fixture = createFixture('adhoc-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      const warnSpy = spyOn(console, 'warn');

      component.downloadReport('csv');

      expect(warnSpy).toHaveBeenCalledWith('Please select depot before downloading');
    });

    it('should call download with built params and forward the blob to downloadFile', () => {
      const fixture = createFixture('daily-report');
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
        svc_prov_id: 1,
        depot_id: 7,
      });
      expect(downloadFileSpy).toHaveBeenCalled();
    });

    it('should send a null business_day for an adhoc report download', () => {
      const fixture = createFixture('adhoc-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      component.depotSelected = '7';

      component.downloadReport('pdf');

      expect(mockDailyReportService.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ business_day: null })
      );
    });

    it('should log an error when the download service errors', () => {
      const fixture = createFixture('daily-report');
      const component = fixture.componentInstance;
      fixture.detectChanges();
      mockDailyReportService.download.and.returnValue(throwError(() => new Error('boom')));
      const errorSpy = spyOn(console, 'error');
      component.depotSelected = '7';
      component.businessDaySelected = '2026-03-15T12:00:00';

      component.downloadReport('pdf');

      expect(errorSpy).toHaveBeenCalledWith('Download failed:', jasmine.any(Error));
    });
  });

  describe('downloadFile', () => {
    let component: BusTransferReportComponent;
    let createObjectURLSpy: jasmine.Spy;
    let revokeObjectURLSpy: jasmine.Spy;
    let mockLink: { href: string; download: string; click: jasmine.Spy };

    beforeEach(() => {
      const fixture = createFixture('daily-report');
      component = fixture.componentInstance;
      fixture.detectChanges();

      createObjectURLSpy = spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      revokeObjectURLSpy = spyOn(window.URL, 'revokeObjectURL');
      mockLink = { href: '', download: '', click: jasmine.createSpy('click') };
      const realCreateElement = document.createElement.bind(document);
      spyOn(document, 'createElement').and.callFake((tagName: string) =>
        tagName === 'a' ? (mockLink as unknown as HTMLAnchorElement) : realCreateElement(tagName)
      );
    });

    it('should create an object URL, set link attributes, click, and revoke the URL', () => {
      const blob = new Blob(['data']);

      component.downloadFile(blob, 'csv');

      expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toMatch(/^bus_data_transfer_report_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(mockLink.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should map the excel format to an xlsx file extension', () => {
      const blob = new Blob(['data']);

      component.downloadFile(blob, 'excel');

      expect(mockLink.download).toMatch(/\.xlsx$/);
    });

    it('should keep the pdf extension as-is', () => {
      const blob = new Blob(['data']);

      component.downloadFile(blob, 'pdf');

      expect(mockLink.download).toMatch(/\.pdf$/);
    });
  });
});
