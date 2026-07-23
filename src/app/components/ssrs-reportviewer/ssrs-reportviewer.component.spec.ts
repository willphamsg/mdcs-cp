import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SSRSReportViewerComponent } from './ssrs-reportviewer.component';
import { ReportService } from '@app/services/report.service';
import { AuthService } from '@app/services/auth.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID, SimpleChange } from '@angular/core';

describe('SSRSReportViewerComponent', () => {
  let component: SSRSReportViewerComponent;
  let fixture: ComponentFixture<SSRSReportViewerComponent>;
  let reportServiceSpy: jasmine.SpyObj<ReportService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    reportServiceSpy = jasmine.createSpyObj('ReportService', ['getReportURL']);
    reportServiceSpy.getReportURL.and.returnValue('http://report-server/report');
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getUsername']);
    authServiceSpy.getUsername.and.returnValue('testuser');

    await TestBed.configureTestingModule({
      imports: [SSRSReportViewerComponent],
      providers: [
        { provide: ReportService, useValue: reportServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SSRSReportViewerComponent);
    component = fixture.componentInstance;
    component.parameter = { spid: '', businessday: null, depotid: null } as any;
    component.option = { toolbar: 'false', showparameter: 'false' } as any;
    component.reportname = 'TestReport';
    component.reportType = 'daily-report';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set sanitizedUrl to null when parameter has null businessday and depotid', () => {
    component.ngOnInit();
    expect(component.sanitizedUrl).toBeNull();
    expect(component.isIframeLoaded).toBeFalse();
  });

  it('should load report on ngOnChanges when parameter has valid values', () => {
    component.parameter = { spid: 'SP1', businessday: '2025-01-01', depotid: 'D1' } as any;
    component.ngOnChanges({
      parameter: new SimpleChange(null, component.parameter, false),
    });
    expect(reportServiceSpy.getReportURL).toHaveBeenCalled();
    expect(component.isIframeLoaded).toBeTrue();
    expect(component.sanitizedUrl).not.toBeNull();
  });

  it('should not load report when businessday is NaN-NaN-NaN', () => {
    component.parameter = { spid: 'SP1', businessday: 'NaN-NaN-NaN', depotid: 'D1' } as any;
    component.ngOnChanges({
      parameter: new SimpleChange(null, component.parameter, false),
    });
    expect(component.sanitizedUrl).toBeNull();
    expect(component.isIframeLoaded).toBeFalse();
  });

  it('should not load report when depotid is null', () => {
    component.parameter = { spid: 'SP1', businessday: '2025-01-01', depotid: null } as any;
    component.ngOnChanges({
      parameter: new SimpleChange(null, component.parameter, false),
    });
    expect(component.sanitizedUrl).toBeNull();
  });

  it('should format date correctly with subtract', () => {
    const result = component.formatDateOffset('2025-01-10', 'substract', 5);
    expect(result).toBe('2025-01-05');
  });

  it('should format date correctly with add', () => {
    const result = component.formatDateOffset('2025-01-10', 'add', 5);
    expect(result).toBe('2025-01-15');
  });

  it('should handle month rollover in formatDateOffset', () => {
    const result = component.formatDateOffset('2025-01-01', 'substract', 1);
    expect(result).toBe('2024-12-31');
  });

  it('should return current time as HH:MM:SS string', () => {
    const time = component.getCurrentTime();
    expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('should emit isIframeLoadedEvent on iframe load', () => {
    spyOn(component.isIframeLoadedEvent, 'emit');
    component.onIframeLoad();
    expect(component.isIframeLoaded).toBeTrue();
    expect(component.isIframeLoadedEvent.emit).toHaveBeenCalledWith(true);
  });

  it('should clean up on destroy', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
