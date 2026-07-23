import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { IDepoList } from '@app/models/depo';
import { ISystemInfo } from '@app/models/maitenance';
import { PayloadResponse } from '@app/models/common';
import { MaintenanceSharedService } from '@app/services/maintenance-shared.service';
import { AuthService } from '@app/services/auth.service';
import { BehaviorSubject, of } from 'rxjs';
import { SystemInformationComponent } from './system-information.component';

describe('SystemInformationComponent', () => {
  let component: SystemInformationComponent;
  let fixture: ComponentFixture<SystemInformationComponent>;
  let mockSharedService: jasmine.SpyObj<MaintenanceSharedService> & {
    selectedDepot$: BehaviorSubject<IDepoList | null>;
  };

  const mockDepot: IDepoList = {
    id: 1,
    depot_id: '1',
    version: 1,
    depot_name: 'Hougang Depot',
    depot_code: 'HD',
  };

  const mockMdcsInfo: ISystemInfo[] = [
    { sectionName: 'MDCS', details: [{ label: 'Version', value: '1.0' }] },
  ];

  const mockDagwInfo: ISystemInfo[] = [
    { sectionName: 'DAGW', details: [{ label: 'Version', value: '2.0' }] },
  ];

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'OK',
    payload: {
      'mdcs-information': mockMdcsInfo,
      'dagw-information': mockDagwInfo,
      'mdcs-last-updated': '2024-01-01',
      'dagw-last-updated': '2024-01-02',
      'mdcs-service-details': { serviceA: 1, serviceB: 2 },
      'dagw-service-details': { serviceC: 3 },
    },
  };

  const selectedDepotSubject = new BehaviorSubject<IDepoList | null>(null);

  beforeEach(waitForAsync(() => {
    mockSharedService = jasmine.createSpyObj(
      'MaintenanceSharedService',
      ['searchSystemInfo', 'updateSelectedDepot', 'resetFormGroup'],
      { selectedDepot$: selectedDepotSubject.asObservable() }
    ) as any;
    mockSharedService.searchSystemInfo.and.returnValue(of(mockPayloadResponse));

    const mockAuthService = jasmine.createSpyObj('AuthService', [
      'isDagw', 'getToken', 'getSVCProvider', 'fetchProfile', 'isAuthenticated',
    ]);
    mockAuthService.isDagw.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: MaintenanceSharedService, useValue: mockSharedService },
        { provide: AuthService, useValue: mockAuthService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    selectedDepotSubject.next(null);
    fixture = TestBed.createComponent(SystemInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should subscribe to selectedDepot$ and call searchSystemInfo when depot emits', () => {
    selectedDepotSubject.next(mockDepot);

    expect(component.depot).toEqual(mockDepot);
    expect(mockSharedService.searchSystemInfo).toHaveBeenCalledWith({ depot_id: '1' });
  });

  it('should populate system information fields from response', () => {
    selectedDepotSubject.next(mockDepot);

    expect(component.mdcsInformation).toEqual(mockMdcsInfo);
    expect(component.dagwInformation).toEqual(mockDagwInfo);
    expect(component.mdcsLastUpdate).toBe('2024-01-01');
    expect(component.dagwLastUpdate).toBe('2024-01-02');
    expect(component.mdcsServiceNames).toEqual(['serviceA', 'serviceB']);
    expect(component.dagwServiceNames).toEqual(['serviceC']);
  });

  it('should not call searchSystemInfo when depot is null', () => {
    mockSharedService.searchSystemInfo.calls.reset();
    selectedDepotSubject.next(null);

    expect(mockSharedService.searchSystemInfo).not.toHaveBeenCalled();
  });

  it('should call updateSelectedDepot(null) and resetFormGroup on destroy', () => {
    component.ngOnDestroy();

    expect(mockSharedService.updateSelectedDepot).toHaveBeenCalledWith(null);
    expect(mockSharedService.resetFormGroup).toHaveBeenCalled();
  });

  it('should complete destroy$ on ngOnDestroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  it('should handle the case when no depot is selected', () => {
    expect(component.depot).toBeNull();
    expect(component.mdcsInformation).toEqual([]);
    expect(component.dagwInformation).toEqual([]);
  });

  it('should load system information on initialization', () => {
    selectedDepotSubject.next(mockDepot);
    expect(mockSharedService.searchSystemInfo).toHaveBeenCalled();
  });

  it('should subscribe to selectedDepot$ and fetch task items', () => {
    selectedDepotSubject.next(mockDepot);
    expect(component.depot).toEqual(mockDepot);
    expect(mockSharedService.searchSystemInfo).toHaveBeenCalledWith({ depot_id: '1' });
  });

  it('should unsubscribe from observables and reset data on destroy', () => {
    component.ngOnDestroy();
    expect(mockSharedService.updateSelectedDepot).toHaveBeenCalledWith(null);
    expect(mockSharedService.resetFormGroup).toHaveBeenCalled();
  });
});
