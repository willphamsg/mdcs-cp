import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { IDepoList } from '@app/models/depo';
import { PayloadResponse } from '@app/models/common';
import { AuthService } from '@app/services/auth.service';
import { FilterService } from '@app/services/filter.service';
import { MaintenanceSharedService } from '@app/services/maintenance-shared.service';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { EodProcessComponent } from './eod-process.component';

describe('EodProcessComponent', () => {
  let component: EodProcessComponent;
  let fixture: ComponentFixture<EodProcessComponent>;
  let mockSharedService: jasmine.SpyObj<MaintenanceSharedService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockDepot: IDepoList = {
    id: 1,
    depot_id: '1',
    version: 1,
    depot_name: 'Hougang Depot',
    depot_code: 'HD',
  };

  const selectedDepotSubject = new BehaviorSubject<IDepoList | null>(null);

  const mockEodResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'OK',
    payload: {
      'check-eod-status': {
        eodProcessDtoList: [
          { task: 'Task 1', start_time: '10:00', end_time: '10:05', status: 1 },
        ],
      },
    },
  };

  const mockEodDateResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'OK',
    payload: { 'eod-dates': { lastEod: '2024-01-01', nextEod: '2024-01-02' } },
  };

  const routerEvents = new Subject<any>();

  beforeEach(waitForAsync(() => {
    mockSharedService = jasmine.createSpyObj(
      'MaintenanceSharedService',
      ['eodCheckStatus', 'getEODDate', 'updateSelectedDepot', 'resetFormGroup', 'triggerForceEOD'],
      { selectedDepot$: selectedDepotSubject.asObservable() }
    );
    mockFilterService = jasmine.createSpyObj('FilterService', ['clearSelectedFilters']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['isDagw', 'hasAccess']);

    mockSharedService.eodCheckStatus.and.returnValue(of(mockEodResponse));
    mockSharedService.getEODDate.and.returnValue(of(mockEodDateResponse));
    mockAuthService.hasAccess.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: MaintenanceSharedService, useValue: mockSharedService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: { events: routerEvents.asObservable() } },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    selectedDepotSubject.next(null);
    fixture = TestBed.createComponent(EodProcessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should subscribe to selectedDepot$ and fetch task items', () => {
    selectedDepotSubject.next(mockDepot);

    expect(component.depot).toEqual(mockDepot);
    expect(mockSharedService.eodCheckStatus).toHaveBeenCalled();
  });

  it('should unsubscribe from observables and reset data on destroy', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(mockSharedService.updateSelectedDepot).toHaveBeenCalled();
    expect(mockSharedService.resetFormGroup).toHaveBeenCalled();
    expect(mockFilterService.clearSelectedFilters).toHaveBeenCalled();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
