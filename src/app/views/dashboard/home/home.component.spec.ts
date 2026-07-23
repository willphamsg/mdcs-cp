import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync, fakeAsync, tick } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@app/services/auth.service';
import { DepoService } from '@services/depo.service';
import { DashboardService } from '@app/services/dashboard.service';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { of } from 'rxjs';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockDashboardService: jasmine.SpyObj<DashboardService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockDepot = { id: 1, depot_id: '1', version: 1, depot_name: 'Test Depot', depot_code: 'TD' };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([mockDepot]),
    });

    mockDashboardService = jasmine.createSpyObj('DashboardService', [
      'search', 'getDagwStatus', 'getTaskList', 'getBusTransferCount',
    ]);
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'getUserRoles', 'isWebSocketEnabled', 'wsUrl', 'getToken',
    ]);

    mockDashboardService.search.and.returnValue(of({ status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK', payload: { depot_bus_count: [] } }));
    mockDashboardService.getDagwStatus.and.returnValue(of({ status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK', payload: {} }));
    mockDashboardService.getTaskList.and.returnValue(of({ status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK', payload: {} }));
    mockDashboardService.getBusTransferCount.and.returnValue(of({ status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK', payload: { count: 0 } }));
    mockAuthService.getUserRoles.and.returnValue([]);
    mockAuthService.isWebSocketEnabled.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: AuthService, useValue: mockAuthService },
        provideCharts(withDefaultRegisterables()),
        provideRouter([]),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clear interval to prevent timer leaks
    // if (component.intervalId) {
    //   clearInterval(component.intervalId);
    // }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load depots on init', () => {
    expect(component.depots).toEqual([mockDepot]);
  });

  it('should have default hourSelected of 1', () => {
    expect(component.hourSelected).toBe(1);
  });

  it('should set hour and restart polling', () => {
    spyOn<any>(component, 'generateBusesRendered');
    component.setHour(12);
    expect(component.hourSelected).toBe(12);
  });

  it('should update depotSelected on handleSelectDepot', () => {
    spyOn<any>(component, 'generateBusesRendered');
    component.handleSelectDepot({ value: '2' });
    expect(component.depotSelected).toBe('2');
  });

  it('should return chart config for a connected bus', () => {
    const connectedBus = { depot_name: 'Test', total: 5, bus_details: [] } as any;
    const config = component.chartConfig(connectedBus);
    expect(config.title).toBe('Test');
    expect(config.subtitle).toBe('Bus in Depot: 5');
  });

  it('should transform chart data', () => {
    const connectedBus = {
      bus_details: [
        { time: '08:00', num_of_buses: 3 },
        { time: '09:00', num_of_buses: 5 },
      ],
    } as any;
    const result = component.transformChartData(connectedBus);
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ x: '08:00', y: 3 });
  });

  it('should clear interval and unsubscribe on destroy', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
