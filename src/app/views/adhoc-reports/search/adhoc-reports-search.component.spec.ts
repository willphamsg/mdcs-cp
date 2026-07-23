import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { MessageService } from '@app/services/message.service';
import { of } from 'rxjs';
import { AdhocReportsComponent } from './adhoc-reports-search.component';

describe('AdhocReportsComponent', () => {
  let component: AdhocReportsComponent;
  let fixture: ComponentFixture<AdhocReportsComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const mockPayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'OK',
    payload: { svc_prov_info: [{ svc_prov_id: '1', svc_prov_name: 'Test' }] },
  };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([]),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['search']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['MessageResponse']);

    mockAuthService.getSVCProvider.and.returnValue('1');
    mockDepoService.search.and.returnValue(of(mockPayloadResponse));
    mockCommonService.search.and.returnValue(of(mockPayloadResponse));
    mockMessageService.MessageResponse.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(AdhocReportsComponent, { set: { template: '<div></div>' } })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdhocReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have default report_type', () => {
    expect(component.report_type).toBe('bus_arrival_exception_list');
  });

  it('should have default reportName', () => {
    expect(component.reportName).toBe('BusArrivalExceptionReport');
  });

  it('should set today on init', () => {
    expect(component.today).toBeTruthy();
  });

  it('should have a tabList with 6 tabs', () => {
    expect(component.tabList).toHaveSize(6);
  });

  it('should generate months on init', () => {
    expect(component.months).toHaveSize(3);
  });

  it('should call loadDepotsAndOperators on init', () => {
    expect(mockCommonService.search).toHaveBeenCalled();
    expect(mockDepoService.search).toHaveBeenCalled();
  });

  it('should reset fields on tab change', () => {
    const tabEvent = { tab: { textLabel: 'bus_list_audit_trail' }, index: 1 } as MatTabChangeEvent;
    component.onTabChange(tabEvent);
    expect(component.report_type).toBe('bus_list_audit_trail');
    expect(component.depotSelected).toBe('');
    expect(component.businessDaySelected).toBe('');
  });

  it('should map report_type to reportName via changeReport', () => {
    component.changeReport('bus_list_audit_trail');
    expect(component.reportName).toBe('BusAuditTrailReport');

    component.changeReport('bus_partial_upload');
    expect(component.reportName).toBe('BusPartialUploadReport');

    component.changeReport('daily_bus_list');
    expect(component.reportName).toBe('DailyBusListReport');

    component.changeReport('bus_transfer');
    expect(component.reportName).toBe('BusTransferReport');

    component.changeReport('DAGW_monthly_availability');
    expect(component.reportName).toBe('DAGWMontlyAvailability');

    component.changeReport('unknown');
    expect(component.reportName).toBe('BusArrivalExceptionReport');
  });

  it('should set isButtonClick on onViewReport when depot selected', () => {
    component.depotSelected = '1';
    component.onViewReport();
    expect(component.isButtonClick).toBeTrue();
  });

  it('should not set isButtonClick on onViewReport when depot not selected', () => {
    component.depotSelected = '';
    component.onViewReport();
    expect(component.isButtonClick).toBeFalse();
  });

  it('should toggle isButtonClick via isIframeLoadedEvent', () => {
    component.isIframeLoadedEvent(true);
    expect(component.isButtonClick).toBeFalse();

    component.isIframeLoadedEvent(false);
    expect(component.isButtonClick).toBeTrue();
  });

  it('should format date correctly', () => {
    const result = component.formatDate('2024-03-15');
    expect(result).toBe('2024-03-15');
  });

  it('should getMonthValue return 3 months', () => {
    const months = component.getMonthValue(new Date(2024, 5, 15));
    expect(months).toHaveSize(3);
  });

  it('should unsubscribe on destroy', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
