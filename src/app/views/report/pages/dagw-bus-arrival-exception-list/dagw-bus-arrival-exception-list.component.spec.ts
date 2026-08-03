import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { IDepoList } from '@app/models/depo';
import { PayloadResponse } from '@app/models/common';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { DailyReportService } from '@app/services/daily-report.service';
import { MessageService } from '@app/services/message.service';
import { FilterService } from '@app/services/filter.service';
import { ReportService } from '@app/services/report.service';
import DummyData from '@data/db.json';
import { of } from 'rxjs';
import { DAGWBusArrivalExceptionListComponent } from './dagw-bus-arrival-exception-list.component';

describe('DAGWBusArrivalExceptionListComponent', () => {
  let component: DAGWBusArrivalExceptionListComponent;
  let fixture: ComponentFixture<DAGWBusArrivalExceptionListComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockDailyReportService: jasmine.SpyObj<DailyReportService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockReportService: jasmine.SpyObj<ReportService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;

  const okResponse = (payload: unknown): PayloadResponse => ({
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'OK',
    payload,
  });

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depo$: of('1'),
      depoList$: of(mockDepots),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockDailyReportService = jasmine.createSpyObj('DailyReportService', ['download']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['search']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['MessageResponse']);
    mockFilterService = jasmine.createSpyObj('FilterService', ['clearSelectedFilters']);
    mockReportService = jasmine.createSpyObj('ReportService', ['getReportData']);

    mockAuthService.getSVCProvider.and.returnValue('1');
    mockDailyReportService.download.and.returnValue(of(new Blob()));
    mockCommonService.search.and.returnValue(of(okResponse({ svc_prov_info: [] })));
    mockMessageService.MessageResponse.and.returnValue(true);
    mockDepoService.search.and.returnValue(of(okResponse({ depot_info: mockDepots })));
    mockReportService.getReportData.and.returnValue(
      of(okResponse({ bus_arrival_exception_records: [] }))
    );

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DailyReportService, useValue: mockDailyReportService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: ReportService, useValue: mockReportService },
        { provide: ActivatedRoute, useValue: { snapshot: { url: [{ path: 'daily-report' }] } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(DAGWBusArrivalExceptionListComponent, { set: { template: '<div></div>' } })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DAGWBusArrivalExceptionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form and load selections on ngOnInit', () => {
    expect(component.depots).toEqual(mockDepots);
  });

  describe('subscribeToDepoChanges', () => {
    it('should populate params from the depo/depotList streams and set business_day to selectedDate', () => {
      expect(component.params.depot).toBe(1);
      expect(component.params.svc_Provider_Id).toBe(1);
      expect(component.params.business_day).toBe(component.selectedDate);
      expect(component.depots).toEqual(mockDepots);
    });
  });

  describe('ngOnDestroy', () => {
    it('should emit and complete the destroy subject', () => {
      const nextSpy = spyOn(component.destroy$, 'next').and.callThrough();
      const completeSpy = spyOn(component.destroy$, 'complete').and.callThrough();

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('changeBusinessDay', () => {
    it('should update selectedDate from the datepicker event and re-subscribe to depo changes', () => {
      const resubscribeSpy = spyOn(component, 'subscribeToDepoChanges').and.callThrough();
      const event = { value: new Date(2026, 2, 5) } as MatDatepickerInputEvent<Date>;

      component.changeBusinessDay('start', event);

      expect(component.selectedDate).toBe('2026-03-05');
      expect(resubscribeSpy).toHaveBeenCalled();
    });

    it('should zero-pad single digit months and days', () => {
      const event = { value: new Date(2026, 0, 9) } as MatDatepickerInputEvent<Date>;

      component.changeBusinessDay('start', event);

      expect(component.selectedDate).toBe('2026-01-09');
    });
  });

  describe('menuHandler', () => {
    it('should set expandedMenu to the given value', () => {
      component.menuHandler(true);
      expect(component.expandedMenu).toBeTrue();

      component.menuHandler(false);
      expect(component.expandedMenu).toBeFalse();
    });
  });

  describe('fetchReportData', () => {
    it('should warn and not call the report service when depot/business day are missing', () => {
      const warnSpy = spyOn(console, 'warn');
      component.depotSelected = '';

      component.fetchReportData();

      expect(warnSpy).toHaveBeenCalledWith(
        'Please select depot and business day before viewing report'
      );
      expect(mockReportService.getReportData).not.toHaveBeenCalled();
    });

    it('should populate dataSource and clear isButtonClick when status is 200', () => {
      mockReportService.getReportData.and.returnValue(
        of(okResponse({ bus_arrival_exception_records: [{ id: 1 }] }))
      );
      component.depotSelected = '5';
      component.selectedDate = '2026-03-05';

      component.fetchReportData();

      expect(component.dataSource).toEqual([{ id: 1 }] as never);
      expect(component.isButtonClick).toBeFalse();
    });

    it('should default dataSource to an empty array when bus_arrival_exception_records is missing', () => {
      mockReportService.getReportData.and.returnValue(of(okResponse({})));
      component.depotSelected = '5';
      component.selectedDate = '2026-03-05';

      component.fetchReportData();

      expect(component.dataSource).toEqual([]);
    });

    it('should not update dataSource or isButtonClick when the status is not 200', () => {
      mockReportService.getReportData.and.returnValue(
        of({ status: 500, status_code: 'ERROR', timestamp: Date.now(), message: 'fail', payload: {} })
      );
      component.depotSelected = '5';
      component.selectedDate = '2026-03-05';

      component.fetchReportData();

      expect(component.isButtonClick).toBeTrue();
      expect(component.dataSource).toEqual([]);
    });
  });

  describe('onTabChange', () => {
    it('should clear selected filters and re-subscribe to depo changes', () => {
      const resubscribeSpy = spyOn(component, 'subscribeToDepoChanges').and.callThrough();

      component.onTabChange({} as MatTabChangeEvent);

      expect(mockFilterService.clearSelectedFilters).toHaveBeenCalled();
      expect(resubscribeSpy).toHaveBeenCalled();
    });
  });

  describe('exportCSV / downloadCSVFromArray', () => {
    it('should warn and skip export when there is no data', () => {
      const warnSpy = spyOn(console, 'warn');
      component.dataSource = [];

      component.exportCSV();

      expect(warnSpy).toHaveBeenCalledWith('No data to export');
    });

    it('should build and download a CSV from the current dataSource', () => {
      component.dataSource = [
        { name: 'Bus 1', reason: 'Late "again"' },
        { name: 'Bus 2', reason: null },
      ] as unknown as typeof component.dataSource;
      const createObjectURLSpy = spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      const mockLink = { setAttribute: jasmine.createSpy('setAttribute'), click: jasmine.createSpy('click') };
      const realCreateElement = document.createElement.bind(document);
      spyOn(document, 'createElement').and.callFake((tagName: string) =>
        tagName === 'a' ? (mockLink as unknown as HTMLAnchorElement) : realCreateElement(tagName)
      );

      component.exportCSV();

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'bus_arrival_exceptions.csv');
      expect(mockLink.click).toHaveBeenCalled();
      // Ensure the value/quote-escaping (?? '' and replaceAll) branches executed without throwing
      expect(createObjectURLSpy.calls.mostRecent().args[0] instanceof Blob).toBeTrue();
    });
  });

  describe('print', () => {
    // `location.reload` is not writable/configurable in this Karma/Chrome
    // environment: `spyOn(location, 'reload')` throws immediately, and
    // replacing `window.location` itself via `Object.defineProperty` (even
    // with `configurable: true` requested) only ever succeeds once per
    // browser session - later redefinition attempts (including a restore in
    // afterEach) throw "Cannot redefine property: location", leaving
    // window.location permanently broken for every other spec sharing this
    // browser tab. Worse, if the fake silently fails to take effect, the real
    // `print()` calling the real `location.reload()` would trigger an actual
    // page reload inside the Karma runner tab, crashing the entire test run -
    // not just this file. Kept only so the pending body below still
    // type-checks - never actually invoked.
    function stubWindowLocation(): { reload: jasmine.Spy } {
      return { reload: jasmine.createSpy('reload') };
    }

    it('should do nothing when no print-section element exists', () => {
      // print()'s printContents guard returns before ever touching
      // location.reload() in this branch, so this scenario is safely
      // testable without faking window.location at all.
      const printSpy = spyOn(window, 'print');
      spyOn(document, 'getElementById').and.returnValue(null);

      component.print();

      expect(printSpy).not.toHaveBeenCalled();
    });

    // Skipped: exercising this branch requires faking window.location.reload,
    // which this environment cannot do reliably (see comment above) without
    // risking a real page reload that would crash the whole test run.
    xit('should swap body content, print, and reload when a print-section element exists', () => {
      const printSpy = spyOn(window, 'print');
      const { reload: reloadSpy } = stubWindowLocation();
      const fakeSection = { innerHTML: '<p>Printable Report</p>' } as unknown as HTMLElement;
      spyOn(document, 'getElementById').and.returnValue(fakeSection);
      const fakeBody = { innerHTML: '<div id="app-root">original</div>' } as unknown as HTMLElement;
      spyOnProperty(document, 'body', 'get').and.returnValue(fakeBody);

      component.print();

      expect(fakeBody.innerHTML).toBe('<div id="app-root">original</div>');
      expect(printSpy).toHaveBeenCalled();
      expect(reloadSpy).toHaveBeenCalled();
    });
  });
});
