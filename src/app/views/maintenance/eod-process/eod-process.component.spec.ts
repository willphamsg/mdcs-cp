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
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { EodProcessComponent } from './eod-process.component';
import { WebSocketService } from '@app/services/web-socket.service';

describe('EodProcessComponent', () => {
  let component: EodProcessComponent;
  let fixture: ComponentFixture<EodProcessComponent>;
  let mockSharedService: jasmine.SpyObj<MaintenanceSharedService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;

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

    mockWebSocketService = jasmine.createSpyObj('WebSocketService', ['refreshTrigger']);
    mockWebSocketService.refreshTrigger.and.returnValue(new Subject());

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: MaintenanceSharedService, useValue: mockSharedService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: { events: routerEvents.asObservable() } },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: WebSocketService, useValue: mockWebSocketService },
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

  it('should stop polling when a NavigationStart event fires', () => {
    spyOn(component, 'stopPolling');

    routerEvents.next(new NavigationStart(1, '/next'));

    expect(component.stopPolling).toHaveBeenCalled();
  });

  it('should not stop polling for non-NavigationStart router events', () => {
    spyOn(component, 'stopPolling');

    routerEvents.next({ type: 'other' });

    expect(component.stopPolling).not.toHaveBeenCalled();
  });

  describe('eodDateHandler', () => {
    it('should set eodDates when the response status is 200', () => {
      mockSharedService.getEODDate.and.returnValue(of(mockEodDateResponse));

      component.eodDateHandler();

      expect(component.eodDates).toEqual(mockEodDateResponse.payload['eod-dates']);
    });

    it('should not set eodDates when the response status is not 200', () => {
      mockSharedService.getEODDate.and.returnValue(
        of({ ...mockEodDateResponse, status: 500 } as any)
      );
      component.eodDates = undefined;

      component.eodDateHandler();

      expect(component.eodDates).toBeUndefined();
    });
  });

  describe('reloadHandler', () => {
    it('should not update dataSource when the response status is not 200', () => {
      mockSharedService.eodCheckStatus.and.returnValue(
        of({ status: 500, payload: {} } as any)
      );
      component.dataSource = [];

      component.reloadHandler();

      expect(component.dataSource).toEqual([]);
    });

    it('should skip disable-state recalculation while forcing EOD', () => {
      component.isForcingEOD = true;
      component.isDisabled = false;
      mockSharedService.eodCheckStatus.and.returnValue(of(mockEodResponse));

      component.reloadHandler();

      expect(component.isDisabled).toBeFalse();
    });

    it('should recalculate the disable state when not forcing EOD', () => {
      component.isForcingEOD = false;
      mockSharedService.eodCheckStatus.and.returnValue(
        of({
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
        } as any)
      );

      component.reloadHandler();

      expect(component.isDisabled).toBeTrue();
    });
  });

  describe('shouldDisableForceEOD', () => {
    it('should disable when payload is empty or missing', () => {
      expect(component.shouldDisableForceEOD([])).toBeTrue();
      expect(component.shouldDisableForceEOD(null as any)).toBeTrue();
    });

    it('should disable when any item is in progress', () => {
      expect(
        component.shouldDisableForceEOD([{ status: 2 }, { status: 0 }])
      ).toBeTrue();
    });

    it('should disable when every item is completed', () => {
      expect(
        component.shouldDisableForceEOD([{ status: 1 }, { status: 1 }])
      ).toBeTrue();
    });

    it('should enable when there are failed or not-started items', () => {
      expect(
        component.shouldDisableForceEOD([{ status: 0 }, { status: 1 }])
      ).toBeFalse();
      expect(
        component.shouldDisableForceEOD([{ status: null }, { status: 1 }])
      ).toBeFalse();
    });

    it('should default to disabled when statuses match none of the known cases', () => {
      expect(component.shouldDisableForceEOD([{ status: 99 }])).toBeTrue();
    });
  });

  describe('handleResetForceEOD', () => {
    it('should reset and stop polling when all items have an end time and EOD is being forced', () => {
      component.isForcingEOD = true;
      component.isDisabled = true;
      spyOn(component, 'stopPolling');
      spyOn(component, 'eodDateHandler');

      component.handleResetForceEOD([
        { end_time: '10:00' },
        { end_time: '10:05' },
      ]);

      expect(component.isForcingEOD).toBeFalse();
      expect(component.isDisabled).toBeFalse();
      expect(component.stopPolling).toHaveBeenCalled();
      expect(component.eodDateHandler).toHaveBeenCalled();
    });

    it('should not reset when not all items have an end time', () => {
      component.isForcingEOD = true;
      spyOn(component, 'stopPolling');

      component.handleResetForceEOD([{ end_time: '10:00' }, { end_time: '' }]);

      expect(component.isForcingEOD).toBeTrue();
      expect(component.stopPolling).not.toHaveBeenCalled();
    });

    it('should not reset when all items are complete but EOD is not being forced', () => {
      component.isForcingEOD = false;
      spyOn(component, 'stopPolling');

      component.handleResetForceEOD([{ end_time: '10:00' }]);

      expect(component.stopPolling).not.toHaveBeenCalled();
    });
  });

  describe('checkStatus', () => {
    it('should return an empty label for a null-status last SAM Server Authentication item', () => {
      expect(component.checkStatus(null, true, true)).toBe('');
    });

    it("should return 'Not Started' for a null status elsewhere", () => {
      expect(component.checkStatus(null, false, true)).toBe('Not Started');
      expect(component.checkStatus(null, true, false)).toBe('Not Started');
    });

    it("should return 'Failed' for status 0", () => {
      expect(component.checkStatus(0, false, false)).toBe('Failed');
    });

    it("should return 'Completed' for status 1", () => {
      expect(component.checkStatus(1, false, false)).toBe('Completed');
    });

    it("should return 'In Progress' for status 2", () => {
      expect(component.checkStatus(2, false, false)).toBe('In Progress');
    });

    it('should return an empty string for an unrecognized status', () => {
      expect(component.checkStatus(99 as any, false, false)).toBe('');
    });
  });

  describe('startPolling / stopPolling', () => {
    it('should reload on each websocket tick', () => {
      const trigger = new Subject<unknown>();
      mockWebSocketService.refreshTrigger.and.returnValue(trigger);
      spyOn(component, 'reloadHandler');

      component.startPolling();
      trigger.next(null);

      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('should unsubscribe an existing subscription on stopPolling', () => {
      const trigger = new Subject<unknown>();
      mockWebSocketService.refreshTrigger.and.returnValue(trigger);
      component.startPolling();
      const subscription = component['pollingSubscription'];
      spyOn(subscription!, 'unsubscribe').and.callThrough();

      component.stopPolling();

      expect(subscription!.unsubscribe).toHaveBeenCalled();
      expect(component['pollingSubscription']).toBeNull();
    });

    it('should be a no-op when there is no active polling subscription', () => {
      component['pollingSubscription'] = null;

      expect(() => component.stopPolling()).not.toThrow();
    });
  });

  describe('clickForceEOD', () => {
    it('should trigger force EOD when the dialog is confirmed', () => {
      const mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
      mockDialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
      mockSharedService.triggerForceEOD.and.returnValue(
        of({ status: 200 } as any)
      );

      component.clickForceEOD();

      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockSharedService.triggerForceEOD).toHaveBeenCalled();
    });

    it('should not trigger force EOD when the dialog is dismissed', () => {
      const mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
      mockDialog.open.and.returnValue({ afterClosed: () => of(false) } as any);

      component.clickForceEOD();

      expect(mockSharedService.triggerForceEOD).not.toHaveBeenCalled();
    });

    it('should start polling when force EOD succeeds', () => {
      const mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
      mockDialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
      mockSharedService.triggerForceEOD.and.returnValue(
        of({ status: 200 } as any)
      );
      spyOn(component, 'startPolling');

      component.clickForceEOD();

      expect(component.startPolling).toHaveBeenCalled();
      expect(component.isForcingEOD).toBeTrue();
    });

    it('should reset state and log an error when force EOD fails', () => {
      const mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
      mockDialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
      mockSharedService.triggerForceEOD.and.returnValue(
        throwError(() => new Error('boom'))
      );

      component.clickForceEOD();

      expect(component.isDisabled).toBeFalse();
      expect(component.isForcingEOD).toBeFalse();
    });
  });

  describe('handleReset', () => {
    it('should clear the disabled and forcing flags', () => {
      component.isDisabled = true;
      component.isForcingEOD = true;

      component.handleReset();

      expect(component.isDisabled).toBeFalse();
      expect(component.isForcingEOD).toBeFalse();
    });
  });

  describe('formatLastEodDate', () => {
    it('should return an empty string for a falsy value', () => {
      expect(component.formatLastEodDate(null)).toBe('');
      expect(component.formatLastEodDate('')).toBe('');
    });

    it('should format a Date instance', () => {
      const date = new Date(2024, 0, 5, 8, 30, 15);
      expect(component.formatLastEodDate(date)).toBe('05/01/2024 08:30:15');
    });

    it('should return an already DD/MM/YYYY HH:mm:ss string unchanged', () => {
      expect(component.formatLastEodDate('05/01/2024 08:30:15')).toBe(
        '05/01/2024 08:30:15'
      );
    });

    it('should append a default time to a DD/MM/YYYY-only string', () => {
      expect(component.formatLastEodDate('05/01/2024')).toBe(
        '05/01/2024 00:00:00'
      );
    });

    it('should reformat a parsable ISO date string', () => {
      const result = component.formatLastEodDate('2024-01-05T08:30:15');
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    });

    it('should return the original trimmed value when parsing fails', () => {
      expect(component.formatLastEodDate('not-a-real-date')).toBe(
        'not-a-real-date'
      );
    });

    it('should stringify non-string, non-Date values', () => {
      expect(component.formatLastEodDate(12345 as any)).toBe('12345');
    });
  });
});
