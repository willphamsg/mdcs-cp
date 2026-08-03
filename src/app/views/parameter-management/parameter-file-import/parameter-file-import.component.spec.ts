import { ComponentFixture, TestBed, waitForAsync, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FileImportExportService } from '@app/services/file-import-export.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { ParameterService } from '@app/services/parameter.service';
import { WebSocketService } from '@app/services/web-socket.service';
import { Store } from '@ngrx/store';
import DummyData from '@data/db.json';
import { of, Subject } from 'rxjs';
import { ParameterFileImportComponent } from './parameter-file-import.component';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';

describe('ParameterFileImportComponent', () => {
  let component: ParameterFileImportComponent;
  let fixture: ComponentFixture<ParameterFileImportComponent>;
  let mockFileImportExportService: jasmine.SpyObj<FileImportExportService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockParameterService: jasmine.SpyObj<ParameterService>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;

  beforeEach(waitForAsync(() => {
    mockFileImportExportService = jasmine.createSpyObj('FileImportExportService', [
      'getDepotService', 'manage', 'import',
    ]);
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'handlePageEvent', 'loadData', 'paginateData', 'getTotalPages', 'clearPagination',
    ], { paginatedData$: of([]), currentPage: 1, pageSize: 10, totalItems: 0 });
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true),
    } as any);
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of(DummyData.depot_list),
    });
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'updateSearchValue', 'clearSelectedFilters', 'updateFilterConfigs',
    ], {
      searchValue$: of(''),
      filterValues$: of({}),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider', 'hasAccess', 'isDagw']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockParameterService = jasmine.createSpyObj('ParameterService', ['search']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);
    mockWebSocketService = jasmine.createSpyObj('WebSocketService', [
      'refreshTrigger',
    ]);

    mockAuthService.getSVCProvider.and.returnValue('1');
    mockAuthService.hasAccess.and.returnValue(true);
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockFileImportExportService.getDepotService.and.returnValue(of(DummyData.depot_list));
    mockFileImportExportService.manage.and.returnValue(of({
      status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK',
      payload: { parameter_file_data: DummyData.parameter_file_data, records_count: DummyData.parameter_file_data.length },
    }));
    mockWebSocketService.refreshTrigger.and.returnValue(new Subject());

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: FileImportExportService, useValue: mockFileImportExportService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: DepoService, useValue: mockDepoService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: ParameterService, useValue: mockParameterService },
        { provide: Store, useValue: mockStore },
        { provide: WebSocketService, useValue: mockWebSocketService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParameterFileImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadFilterValues on init', () => {
    spyOn(component, 'loadFilterValues').and.callThrough();
    component.ngOnInit();
    expect(component.loadFilterValues).toHaveBeenCalled();
  });

  it('should load depots and filter values from the service', () => {
    component.loadFilterValues();
    expect(component.depots).toBeTruthy();
    expect(component.filterConfigs).toHaveSize(2);
  });

  it('should open a dialog when openView is called', () => {
    component.openView();
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  it('should return the configured chk value for a known column via hiddenHandler', () => {
    expect(component.hiddenHandler('file_id')).toBe(true);
    expect(component.hiddenHandler('param_filename')).toBe(false);
  });

  describe('importHandler', () => {
    it('should dispatch an error snackbar and skip the confirmation dialog when a non-zip file is selected', () => {
      const invalidFile = new File(['content'], 'notes.txt', {
        type: 'text/plain',
      });
      const event = {
        target: { files: [invalidFile] },
      } as unknown as Event;

      mockDialog.open.calls.reset();
      mockStore.dispatch.calls.reset();
      const fakeInput = { value: 'notes.txt' };
      component.fileInputRef = { nativeElement: fakeInput } as any;

      component.importHandler(event);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        showSnackbar({
          message: 'Only ZIP file is allowed.',
          title: 'Invalid File',
          typeSnackbar: 'error',
        })
      );
      expect(mockDialog.open).not.toHaveBeenCalled();
      expect(fakeInput.value).toBe('');
    });

    it('should submit the selected files as FormData and handle a successful import response when confirmed', () => {
      const zipFile = new File(['zip-content'], 'params.zip', {
        type: 'application/zip',
      });
      const event = {
        target: { files: [zipFile] },
      } as unknown as Event;

      mockDialog.open.and.returnValue({
        afterClosed: () => of(true),
      } as any);
      mockFileImportExportService.import.and.returnValue(
        of({
          status: 201,
          status_code: 'SUCCESS',
          timestamp: Date.now(),
          message: 'Import started',
          payload: {
            param_import_files: [
              { grp_identifier_id: 'GRP-1' },
              { grp_identifier_id: '' },
            ],
          },
        })
      );
      mockStore.dispatch.calls.reset();
      spyOn(component, 'reloadHandler').and.callThrough();

      component.importHandler(event);

      expect(mockFileImportExportService.import).toHaveBeenCalled();
      const formDataArg = mockFileImportExportService.import.calls
        .mostRecent().args[0] as FormData;
      expect(formDataArg.getAll('file')).toEqual([zipFile]);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        showSnackbar({
          message: 'Import started',
          title: 'Success',
          typeSnackbar: 'success',
        })
      );
      expect(component.currentPage).toBe(1);
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('should clear the file input without importing when the confirmation dialog is dismissed', () => {
      const zipFile = new File(['zip-content'], 'params.zip', {
        type: 'application/zip',
      });
      const event = {
        target: { files: [zipFile] },
      } as unknown as Event;

      mockDialog.open.and.returnValue({
        afterClosed: () => of(false),
      } as any);
      mockFileImportExportService.import.calls.reset();
      const fakeInput = { value: 'params.zip' };
      component.fileInputRef = { nativeElement: fakeInput } as any;

      component.importHandler(event);

      expect(mockFileImportExportService.import).not.toHaveBeenCalled();
      expect(fakeInput.value).toBe('');
    });

    it('should not add grp identifiers when none are present in the response', () => {
      const zipFile = new File(['zip-content'], 'params.zip', {
        type: 'application/zip',
      });
      const event = { target: { files: [zipFile] } } as unknown as Event;

      mockDialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
      mockFileImportExportService.import.and.returnValue(
        of({
          status: 201,
          status_code: 'SUCCESS',
          timestamp: Date.now(),
          message: 'Import started',
          payload: { param_import_files: [{ grp_identifier_id: '' }] },
        })
      );
      component.depotSelected = 1;
      const addSpy = spyOn<any>(component, 'addGrpIdentifierIdsForCurrentDepot');

      component.importHandler(event);

      expect(addSpy).not.toHaveBeenCalled();
    });

    it('should not process the response when status is not 201', () => {
      const zipFile = new File(['zip-content'], 'params.zip', {
        type: 'application/zip',
      });
      const event = { target: { files: [zipFile] } } as unknown as Event;

      mockDialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
      mockFileImportExportService.import.and.returnValue(
        of({
          status: 500,
          status_code: 'ERROR',
          timestamp: Date.now(),
          message: 'fail',
          payload: {},
        } as any)
      );
      mockStore.dispatch.calls.reset();

      component.importHandler(event);

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('onDepotSelected', () => {
    it('resets the table, updates filters for the selected depot, and reloads after the timer', fakeAsync(() => {
      component.depotSelected = 3;
      spyOn(component, 'reloadHandler');
      spyOn<any>(component, 'loadCachedGrpIdentifierIdsForCurrentDepot').and.callThrough();

      component.onDepotSelected();
      tick(0);

      expect(component.dataSource).toEqual([]);
      expect(component.rowCount).toBe(0);
      expect(component.params.search_select_filter['current_depot']).toEqual([3]);
      expect(component.reloadHandler).toHaveBeenCalled();
    }));

    it('sets an empty current_depot filter when no depot is selected', fakeAsync(() => {
      component.depotSelected = undefined;
      spyOn(component, 'reloadHandler');

      component.onDepotSelected();
      tick(0);

      expect(component.params.search_select_filter['current_depot']).toEqual([]);
    }));
  });

  describe('subscribeToDepoChanges', () => {
    it('unsubscribes any previous depo-changes subscription before resubscribing', () => {
      // depoList$/searchValue$/filterValues$ are mocked with of(...), which
      // complete synchronously as soon as they're subscribed. That means the
      // subscription created during ngOnInit is already `closed` by the time
      // this test runs, so the production guard
      // (`if (this.depoChangesSub && !this.depoChangesSub.closed)`) would
      // correctly skip calling unsubscribe() on it - there'd be nothing to
      // tear down. To exercise the actual teardown guard, stub in a fake
      // still-open subscription and verify it gets unsubscribed before the
      // new one is created.
      const previousSub = { closed: false, unsubscribe: jasmine.createSpy('unsubscribe') };
      component['depoChangesSub'] = previousSub as any;

      component.subscribeToDepoChanges();

      expect(previousSub.unsubscribe).toHaveBeenCalled();
    });

    it('defaults mdcsAccess to an empty array when the filter value is missing', () => {
      component.subscribeToDepoChanges();
      expect(component.params.search_select_filter['mdcs_access']).toEqual([]);
    });
  });

  describe('reloadHandler', () => {
    it('resets the table and stops polling when no depot is selected', () => {
      component.depotSelected = undefined;
      mockFileImportExportService.manage.calls.reset();
      spyOn<any>(component, 'stopStatusPolling').and.callThrough();

      component.reloadHandler();

      expect(mockFileImportExportService.manage).not.toHaveBeenCalled();
      expect(component.dataSource).toEqual([]);
      expect(component.rowCount).toBe(0);
      expect(component['stopStatusPolling']).toHaveBeenCalled();
    });

    it('does not update the data source when the response status is not 200', () => {
      component.depotSelected = 1;
      mockFileImportExportService.manage.and.returnValue(
        of({
          status: 500,
          status_code: 'ERROR',
          timestamp: Date.now(),
          message: 'fail',
          payload: {},
        } as any)
      );
      spyOn(component, 'updateDataSource');

      component.reloadHandler();

      expect(component.updateDataSource).not.toHaveBeenCalled();
    });
  });

  describe('updateDataSource', () => {
    it('maps rows with resolved status when data is present', () => {
      component.updateDataSource({
        records_count: 1,
        parameter_file_data: [{ status: 'new' }],
      });

      expect(component.rowCount).toBe(1);
      expect(component.dataSource[0].status).toBe('Importing');
    });

    it('uses an empty array when parameter_file_data is empty', () => {
      component.updateDataSource({ records_count: 0, parameter_file_data: [] });
      expect(component.dataSource).toEqual([]);
    });

    it('defaults records_count to 0 when missing from the payload', () => {
      component.updateDataSource({});
      expect(component.rowCount).toBe(0);
    });
  });

  describe('mapBusList / mapStatusFromBE', () => {
    it('maps new/pending statuses to Importing', () => {
      expect(component.mapBusList({ status: 'new' }).status).toBe('Importing');
      expect(component.mapBusList({ status: 'pending' }).status).toBe('Importing');
    });

    it('maps success to Success', () => {
      expect(component.mapBusList({ status: 'success' }).status).toBe('Success');
    });

    it('maps failed/fail to Failed', () => {
      expect(component.mapBusList({ status: 'failed' }).status).toBe('Failed');
      expect(component.mapBusList({ status: 'fail' }).status).toBe('Failed');
    });

    it('maps cancelled to Cancelled by System', () => {
      expect(component.mapBusList({ status: 'cancelled' }).status).toBe(
        'Cancelled by System'
      );
    });

    it('title-cases an unmapped status', () => {
      expect(component.mapBusList({ status: 'weird' }).status).toBe('Weird');
    });

    it('defaults the description to an empty string when missing', () => {
      expect(component.mapBusList({ status: 'new' }).description).toBe('');
    });

    it('keeps the provided description when present', () => {
      expect(
        component.mapBusList({ status: 'new', description: 'note' }).description
      ).toBe('note');
    });
  });

  describe('sortHandler', () => {
    it('resets sort order and page when direction is cleared', () => {
      spyOn(component, 'reloadHandler');
      const sort: Sort = { active: 'status', direction: '' };

      component.sortHandler(sort);

      expect(component.params.sort_order).toEqual([]);
      expect(component.currentPage).toBe(1);
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('maps a known column and sets desc true for descending sort', () => {
      spyOn(component, 'reloadHandler');
      const sort: Sort = { active: 'status', direction: 'desc' };

      component.sortHandler(sort);

      expect(component.params.sort_order).toEqual([
        { name: 'export_status', desc: true },
      ]);
    });

    it('falls back to the raw column and sets desc false for ascending sort', () => {
      spyOn(component, 'reloadHandler');
      const sort: Sort = { active: 'unknown_col', direction: 'asc' };

      component.sortHandler(sort);

      expect(component.params.sort_order).toEqual([
        { name: 'unknown_col', desc: false },
      ]);
    });
  });

  describe('openView', () => {
    it('reloads when the dialog is closed with a non-cancel result', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of('done') } as any);
      spyOn(component, 'reloadHandler');

      component.openView();

      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('does not reload when the dialog is closed with cancel', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of('cancel') } as any);
      spyOn(component, 'reloadHandler');

      component.openView();

      expect(component.reloadHandler).not.toHaveBeenCalled();
    });
  });

  describe('onTabChange', () => {
    it('clears filters and grp identifiers, then reloads', () => {
      component.grpIdentifierIds = ['GRP-1'];
      spyOn(component, 'reloadHandler');

      component.onTabChange();

      expect(mockFilterService.clearSelectedFilters).toHaveBeenCalled();
      expect(component.grpIdentifierIds).toEqual([]);
      expect(component.params.search_select_filter['grp_identifier_id']).toEqual([]);
      expect(component.reloadHandler).toHaveBeenCalled();
    });
  });

  describe('onPageChange', () => {
    it('updates currentPage and delegates to the pagination service', () => {
      component.onPageChange({ page: 4, pageSize: 10 });
      expect(component.currentPage).toBe(4);
      expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
    });
  });

  describe('checkAndStartPolling (private)', () => {
    it('stops polling and shows the failed dialog when a cancelled item exists and polling was active', () => {
      component.dataSource = [{ status: '-' } as any];
      component['statusPollingSub'] = { closed: false, unsubscribe: () => {} } as any;
      mockDialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
      const clearSpy = spyOn<any>(
        component,
        'clearGrpIdentifierIdsForCurrentDepot'
      ).and.callThrough();

      component['checkAndStartPolling']();

      expect(clearSpy).toHaveBeenCalled();
      expect(mockDialog.open).toHaveBeenCalled();
    });

    it('stops polling without showing a dialog when a cancelled item exists but polling was not active', () => {
      component.dataSource = [{ status: '-' } as any];
      component['statusPollingSub'] = undefined;
      mockDialog.open.calls.reset();

      component['checkAndStartPolling']();

      expect(mockDialog.open).not.toHaveBeenCalled();
    });

    it('starts polling when importing items are present and none are cancelled', () => {
      component.dataSource = [{ status: 'Importing' } as any];
      component.depotSelected = 1;
      const startSpy = spyOn<any>(component, 'startStatusPolling').and.callThrough();

      component['checkAndStartPolling']();

      expect(startSpy).toHaveBeenCalled();
    });

    it('stops polling when all items are final and none are cancelled', () => {
      component.dataSource = [{ status: 'Success' } as any];
      const stopSpy = spyOn<any>(component, 'stopStatusPolling').and.callThrough();

      component['checkAndStartPolling']();

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('startStatusPolling (private)', () => {
    it('does not resubscribe when an active subscription already exists', () => {
      component['statusPollingSub'] = { closed: false, unsubscribe: () => {} } as any;
      mockWebSocketService.refreshTrigger.calls.reset();

      component['startStatusPolling']();

      expect(mockWebSocketService.refreshTrigger).not.toHaveBeenCalled();
    });

    it('does not subscribe when no depot is selected', () => {
      component.depotSelected = undefined;
      component['statusPollingSub'] = undefined;
      mockWebSocketService.refreshTrigger.calls.reset();

      component['startStatusPolling']();

      expect(mockWebSocketService.refreshTrigger).not.toHaveBeenCalled();
    });

    it('subscribes to the websocket refresh trigger when a depot is selected and no active subscription exists', () => {
      component.depotSelected = 1;
      component['statusPollingSub'] = undefined;
      mockWebSocketService.refreshTrigger.and.returnValue(of(null));
      spyOn(component, 'reloadHandler');

      component['startStatusPolling']();

      expect(mockWebSocketService.refreshTrigger).toHaveBeenCalled();
      expect(component.reloadHandler).toHaveBeenCalled();
    });
  });

  describe('stopStatusPolling (private)', () => {
    it('unsubscribes when an active subscription exists', () => {
      const sub = { closed: false, unsubscribe: jasmine.createSpy('unsubscribe') };
      component['statusPollingSub'] = sub as any;

      component['stopStatusPolling']();

      expect(sub.unsubscribe).toHaveBeenCalled();
      expect(component['statusPollingSub']).toBeUndefined();
    });

    it('does nothing when there is no active subscription', () => {
      component['statusPollingSub'] = undefined;
      expect(() => component['stopStatusPolling']()).not.toThrow();
    });
  });

  describe('showImportFailedDialog (private)', () => {
    it('opens the dialog and reloads once it is closed', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
      spyOn(component, 'reloadHandler');

      component['showImportFailedDialog']();

      expect(mockDialog.open).toHaveBeenCalled();
      expect(component.reloadHandler).toHaveBeenCalled();
    });
  });

  describe('getSelectedDepotId (private)', () => {
    it('returns the numeric depot id when a depot is selected', () => {
      component.depotSelected = 7;
      expect(component['getSelectedDepotId']()).toBe(7);
    });

    it('returns undefined when no depot is selected', () => {
      component.depotSelected = undefined;
      expect(component['getSelectedDepotId']()).toBeUndefined();
    });
  });

  describe('setActiveGrpIdentifierIds (private)', () => {
    it('dedupes ids and updates the active filter', () => {
      component['setActiveGrpIdentifierIds'](['A', 'A', 'B']);
      expect(component.grpIdentifierIds).toEqual(['A', 'B']);
      expect(component.params.search_select_filter['grp_identifier_id']).toEqual([
        'A',
        'B',
      ]);
    });
  });

  describe('loadCachedGrpIdentifierIdsForCurrentDepot (private)', () => {
    it('clears active ids when no depot is selected', () => {
      component.depotSelected = undefined;
      component['loadCachedGrpIdentifierIdsForCurrentDepot']();
      expect(component.grpIdentifierIds).toEqual([]);
    });

    it('loads cached ids for the currently selected depot', () => {
      component.depotSelected = 5;
      component['grpIdentifierIdsByDepot'].set(5, ['CACHED-1']);

      component['loadCachedGrpIdentifierIdsForCurrentDepot']();

      expect(component.grpIdentifierIds).toEqual(['CACHED-1']);
    });

    it('defaults to an empty array when no cache entry exists for the depot', () => {
      component.depotSelected = 9;
      component['loadCachedGrpIdentifierIdsForCurrentDepot']();
      expect(component.grpIdentifierIds).toEqual([]);
    });
  });

  describe('addGrpIdentifierIdsForCurrentDepot (private)', () => {
    it('does nothing when no depot is selected', () => {
      component.depotSelected = undefined;
      component['addGrpIdentifierIdsForCurrentDepot'](['A']);
      expect(component.grpIdentifierIds).toEqual([]);
    });

    it('does nothing when the ids array is empty', () => {
      component.depotSelected = 1;
      component['addGrpIdentifierIdsForCurrentDepot']([]);
      expect(component.grpIdentifierIds).toEqual([]);
    });

    it('merges new ids with the existing cache for the depot', () => {
      component.depotSelected = 2;
      component['grpIdentifierIdsByDepot'].set(2, ['EXISTING']);

      component['addGrpIdentifierIdsForCurrentDepot'](['NEW', 'EXISTING']);

      expect(component['grpIdentifierIdsByDepot'].get(2)).toEqual([
        'EXISTING',
        'NEW',
      ]);
      expect(component.grpIdentifierIds).toEqual(['EXISTING', 'NEW']);
    });
  });

  describe('clearGrpIdentifierIdsForCurrentDepot (private)', () => {
    it('removes the cache entry and clears active ids when a depot is selected', () => {
      component.depotSelected = 3;
      component['grpIdentifierIdsByDepot'].set(3, ['A']);

      component['clearGrpIdentifierIdsForCurrentDepot']();

      expect(component['grpIdentifierIdsByDepot'].has(3)).toBeFalse();
      expect(component.grpIdentifierIds).toEqual([]);
    });

    it('clears active ids without a cache lookup when no depot is selected', () => {
      component.depotSelected = undefined;
      expect(() => component['clearGrpIdentifierIdsForCurrentDepot']()).not.toThrow();
      expect(component.grpIdentifierIds).toEqual([]);
    });
  });
});
