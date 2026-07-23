import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '@app/services/auth.service';
import { DailyReportService } from '@app/services/daily-report.service';
import { DepoService } from '@app/services/depo.service';
import { of } from 'rxjs';
import { DailyReportComponent } from './daily-report-search.component';

describe('DailyReportComponent', () => {
  let component: DailyReportComponent;
  let fixture: ComponentFixture<DailyReportComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockDailyReportService: jasmine.SpyObj<DailyReportService>;

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([{ depot_id: '1', depot_name: 'Test Depot', depot_code: 'TD', id: 1, version: 1 }]),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockDailyReportService = jasmine.createSpyObj('DailyReportService', ['download']);

    mockAuthService.getSVCProvider.and.returnValue('1');
    mockDailyReportService.download.and.returnValue(of(new Blob()));

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DailyReportService, useValue: mockDailyReportService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(DailyReportComponent, { set: { template: '<div></div>' } })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DailyReportComponent);
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

  it('should have tabList with 5 tabs', () => {
    expect(component.tabList).toHaveSize(5);
  });

  it('should load depots on init via subscribeDepot', () => {
    expect(component.depots).toHaveSize(1);
    expect(component.depots[0].depot_name).toBe('Test Depot');
  });

  it('should reset fields on tab change', () => {
    component.depotSelected = '1';
    component.businessDaySelected = '2024-01-01';
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

    component.changeReport('bus_data_transfer');
    expect(component.reportName).toBe('BusDataTransferReport');

    component.changeReport('unknown');
    expect(component.reportName).toBe('BusArrivalExceptionReport');
  });

  it('should not call download when depot/businessDay not selected', () => {
    component.depotSelected = '';
    component.businessDaySelected = '';
    component.onViewReport();
    expect(mockDailyReportService.download).not.toHaveBeenCalled();
  });

  it('should call download when depot and businessDay are selected', () => {
    component.depotSelected = '1';
    component.businessDaySelected = '2024-01-01';
    component.onViewReport();
    expect(mockDailyReportService.download).toHaveBeenCalled();
  });

  it('should toggle isButtonClick via isIframeLoadedEvent', () => {
    component.isIframeLoadedEvent(true);
    expect(component.isButtonClick).toBeFalse();
  });

  it('should format date correctly', () => {
    const result = component.formatDate('2024-03-15');
    expect(result).toBe('2024-03-15');
  });

  it('should toggle expandedMenu via menuHandler', () => {
    component.menuHandler(true);
    expect(component.expandedMenu).toBeTrue();
    component.menuHandler(false);
    expect(component.expandedMenu).toBeFalse();
  });

  it('should not call download for exportCSV when fields empty', () => {
    component.depotSelected = '';
    component.businessDaySelected = '';
    component.exportCSV();
    expect(mockDailyReportService.download).not.toHaveBeenCalled();
  });

  it('should unsubscribe on destroy', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
