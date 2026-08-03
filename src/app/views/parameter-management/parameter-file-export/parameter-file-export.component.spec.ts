import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Sort } from '@angular/material/sort';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { IParameterFileExportEntity } from '@app/models/parameter-management';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FileImportExportService } from '@app/services/file-import-export.service';
import { FilterService } from '@app/services/filter.service';
import { MessageService } from '@app/services/message.service';
import { PaginationService } from '@app/services/pagination.service';
import { WebSocketService } from '@app/services/web-socket.service';
import { of, Subject, throwError } from 'rxjs';
import { ParameterFileExportComponent } from './parameter-file-export.component';

describe('ParameterFileExportComponent', () => {
  let component: ParameterFileExportComponent;
  let fixture: ComponentFixture<ParameterFileExportComponent>;
  let mockFileImportExportService: jasmine.SpyObj<FileImportExportService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;

  const mockDepots: IDepoList[] = [
    { depot_id: 1, depot_name: 'Depot A', depot_code: 'DA', version: 1 } as any,
    { depot_id: 2, depot_name: 'Depot B', depot_code: 'DB', version: 1 } as any,
  ];

  const mockExportData: any[] = [
    {
      serviceProviderId: 1,
      param_depot_id: 1,
      param_file_id: '0x001',
      param_file_name: 'BUS_CSFA.SYS',
      param_payload_version: '88',
      param_type: 'Live',
      description: 'Test file',
    },
    {
      serviceProviderId: 1,
      param_depot_id: 2,
      param_file_id: '0x002',
      param_file_name: 'BUS_FARE.SYS',
      param_payload_version: '10',
      param_type: 'Trial',
      description: 'Test file 2',
    },
  ];

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: {
      param_file_export_entity_pgn: mockExportData,
      records_count: 2,
    },
  };

  beforeEach(waitForAsync(() => {
    mockFileImportExportService = jasmine.createSpyObj(
      'FileImportExportService',
      ['manage', 'exportStatus', 'export', 'exportFileRequest']
    );
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'getSelectedFilters',
      'updateFormGroup',
      'clearSelectedFilters',
      'updateSearchValue',
      'updateFilterConfigs',
    ]);
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'loadData',
      'paginateData',
      'getTotalPages',
      'clearPagination',
      'handlePageEvent',
    ]);
    mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open', 'closeAll']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'getServiceProviderId',
      'getSVCProvider',
      'isDagw',
      'hasPermission',
    ]);
    mockMessageService = jasmine.createSpyObj('MessageService', [
      'openExportStatusDialog',
    ]);
    mockWebSocketService = jasmine.createSpyObj('WebSocketService', [
      'refreshTrigger',
    ]);

    mockDepoService.depoList$ = of(mockDepots);
    mockFilterService.searchValue$ = of('');
    mockFilterService.filterValues$ = of({});
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockFileImportExportService.manage.and.returnValue(
      of(mockPayloadResponse)
    );
    mockWebSocketService.refreshTrigger.and.returnValue(new Subject());
    mockMessageService.openExportStatusDialog.and.returnValue({
      afterClosed: () => of(undefined),
    } as any);

    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'removeItem');
    spyOn(localStorage, 'setItem');

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        {
          provide: FileImportExportService,
          useValue: mockFileImportExportService,
        },
        { provide: FilterService, useValue: mockFilterService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: DepoService, useValue: mockDepoService },
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {} } },
        { provide: MatDialog, useValue: mockDialog },
        { provide: CommonService, useValue: mockCommonService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: WebSocketService, useValue: mockWebSocketService },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParameterFileExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load filter values', () => {
    component.loadFilterValues();

    expect(component.filterConfigs).toHaveSize(1);
    expect(component.filterConfigs[0].controlName).toBe('param_type');
  });

  it('should call manage on reloadHandler when depot is selected', () => {
    component.depots = mockDepots;
    component.depotSelected = 1;

    component.reloadHandler();

    expect(mockFileImportExportService.manage).toHaveBeenCalledWith(
      component.params,
      'export'
    );
  });

  it('should select an individual item when checked', () => {
    const mockEvent = { checked: true } as MatCheckboxChange;
    const item = mockExportData[0] as any;

    component.checkHandler(mockEvent, item);
    expect(component.selection).toHaveSize(1);
  });

  it('should deselect an individual item when unchecked', () => {
    const item = mockExportData[0] as any;
    component.selection = [item];

    const mockEvent = { checked: false } as MatCheckboxChange;
    component.checkHandler(mockEvent, item);

    expect(component.selection).toHaveSize(0);
  });

  it('should select all items when checkAllHandler is checked', () => {
    component.dataSource = mockExportData as any[];
    const mockEvent = { checked: true } as MatCheckboxChange;
    component.checkAllHandler(mockEvent);
    expect(component.selection).toHaveSize(component.dataSource.length);
  });

  it('should deselect all items when checkAllHandler is unchecked', () => {
    const mockEvent = { checked: false } as MatCheckboxChange;
    component.checkAllHandler(mockEvent);
    expect(component.selection).toHaveSize(0);
  });

  it('should unsubscribe from observables on destroy', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  describe('isExportDisabled getter', () => {
    it('returns false when localStorage has no stored export data', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      expect(component.isExportDisabled).toBeFalse();
    });

    it('returns false when localStorage export data is an empty array string', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('[]');
      expect(component.isExportDisabled).toBeFalse();
    });

    it('returns true when localStorage has stored export data', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(
        JSON.stringify(mockExportData)
      );
      expect(component.isExportDisabled).toBeTrue();
    });
  });

  describe('onDepotSelected', () => {
    it('sets depot_id filter and grp_identifier_id filter when a depot is selected', () => {
      component.depotSelected = 5;
      component.grpIdentifierIds = ['GRP-1'];
      spyOn(component, 'reloadHandler');

      component.onDepotSelected();

      expect(component.params.search_select_filter['depot_id']).toEqual([5]);
      expect(component.params.search_select_filter['grp_identifier_id']).toEqual([
        'GRP-1',
      ]);
      expect(component.currentPage).toBe(1);
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('sets an empty depot_id filter when no depot is selected', () => {
      component.depotSelected = undefined as any;
      spyOn(component, 'reloadHandler');

      component.onDepotSelected();

      expect(component.params.search_select_filter['depot_id']).toEqual([]);
    });
  });

  describe('checkLocalStorage', () => {
    it('does nothing when storedExportData is not a populated array', () => {
      component.storedExportData = [];
      mockFileImportExportService.exportStatus.calls.reset();

      component.checkLocalStorage();

      expect(mockFileImportExportService.exportStatus).not.toHaveBeenCalled();
    });

    it('shows download failed dialog and stops polling when a cancelled status is returned', () => {
      component.storedExportData = [{ ...mockExportData[0], status: 'PENDING' }];
      mockFileImportExportService.exportStatus.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            param_file_export_entity_pgn: [
              { ...mockExportData[0], status: 'CANCELLED' },
            ],
          },
        } as any)
      );
      // Use a Subject that never emits for afterClosed(): if it emitted
      // synchronously (e.g. via of(undefined)), the dialog's close handler would
      // run immediately and call cleanupAfterDownload(), which resets
      // storedExportData back to [] before we can assert on the cancelled entity.
      const afterClosed$ = new Subject<unknown>();
      mockDialog.open.and.returnValue({ afterClosed: () => afterClosed$ } as any);
      spyOn(component as any, 'stopStatusPolling').and.callThrough();

      component.checkLocalStorage();

      expect(component.storedExportData[0].status).toBe('CANCELLED');
      expect(mockDialog.open).toHaveBeenCalled();
      expect(component['stopStatusPolling']).toHaveBeenCalled();
    });

    it('refreshes table status and tries to open the ready dialog when no cancelled status is returned', () => {
      component.storedExportData = [{ ...mockExportData[0], status: 'PENDING' }];
      component.dataSource = [{ ...mockExportData[0], status: 'PENDING' } as any];
      mockFileImportExportService.exportStatus.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            param_file_export_entity_pgn: [
              { ...mockExportData[0], status: 'SUCCESS' },
            ],
          },
        } as any)
      );

      component.checkLocalStorage();

      expect(component.storedExportData[0].status).toBe('SUCCESS');
      expect(component.dataSource[0].status).toBe('SUCCESS');
    });

    it('does not process the response when status is not 200', () => {
      component.storedExportData = [{ ...mockExportData[0], status: 'PENDING' }];
      mockFileImportExportService.exportStatus.and.returnValue(
        of({
          status: 500,
          status_code: 'ERROR',
          timestamp: Date.now(),
          message: 'fail',
          payload: {},
        } as any)
      );

      component.checkLocalStorage();

      expect(component.storedExportData[0].status).toBe('PENDING');
    });
  });

  describe('intervalStatus', () => {
    it('stops polling and returns early when there is no stored export data', () => {
      component.storedExportData = [];
      spyOn(component as any, 'stopStatusPolling').and.callThrough();

      component.intervalStatus();

      expect(component['stopStatusPolling']).toHaveBeenCalled();
      expect(mockWebSocketService.refreshTrigger).not.toHaveBeenCalled();
    });

    it('subscribes to the websocket refresh trigger when stored data exists and no active subscription', () => {
      component.storedExportData = [mockExportData[0]];
      component['statusPollingSub'] = undefined;
      mockWebSocketService.refreshTrigger.and.returnValue(of(null));
      spyOn(component, 'checkLocalStorage');

      component.intervalStatus();

      expect(mockWebSocketService.refreshTrigger).toHaveBeenCalled();
      expect(component.checkLocalStorage).toHaveBeenCalled();
    });

    it('does not resubscribe when an active polling subscription already exists', () => {
      component.storedExportData = [mockExportData[0]];
      mockWebSocketService.refreshTrigger.calls.reset();
      component['statusPollingSub'] = { closed: false } as any;

      component.intervalStatus();

      expect(mockWebSocketService.refreshTrigger).not.toHaveBeenCalled();
    });
  });

  describe('parameterReady', () => {
    it('calls downloadZip when the dialog result is confirm', () => {
      mockMessageService.openExportStatusDialog.and.returnValue({
        afterClosed: () => of('confirm'),
      } as any);
      spyOn(component, 'downloadZip');

      component.parameterReady();

      expect(component.isParameterReadDialogShown).toBeTrue();
      expect(component.downloadZip).toHaveBeenCalled();
    });

    it('does not call downloadZip when the dialog result is cancel', () => {
      mockMessageService.openExportStatusDialog.and.returnValue({
        afterClosed: () => of('cancel'),
      } as any);
      spyOn(component, 'downloadZip');

      component.parameterReady();

      expect(component.downloadZip).not.toHaveBeenCalled();
    });
  });

  describe('downloadZip', () => {
    beforeEach(() => {
      component.storedExportData = [mockExportData[0]];
    });

    it('uses the server-provided filename when a real filename is returned', () => {
      const blob = new Blob(['zip-content']);
      mockFileImportExportService.export.and.returnValue(
        of({ blob, filename: 'server-file.zip' })
      );
      const createUrlSpy = spyOn(window.URL, 'createObjectURL').and.returnValue(
        'blob:mock-url'
      );
      const revokeSpy = spyOn(window.URL, 'revokeObjectURL');

      component.downloadZip();

      expect(createUrlSpy).toHaveBeenCalledWith(blob);
      expect(revokeSpy).toHaveBeenCalled();
    });

    it('generates a fallback filename when none is returned from the server', () => {
      const blob = new Blob(['zip-content']);
      mockFileImportExportService.export.and.returnValue(
        of({ blob, filename: 'parameter-export.zip' })
      );
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(window.URL, 'revokeObjectURL');
      spyOn(component as any, 'cleanupAfterDownload').and.callThrough();

      component.downloadZip();

      expect(component['cleanupAfterDownload']).toHaveBeenCalled();
    });

    it('shows the download failed dialog when the export request errors', () => {
      mockFileImportExportService.export.and.returnValue(
        throwError(() => new Error('network error'))
      );
      mockDialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);

      component.downloadZip();

      expect(mockDialog.open).toHaveBeenCalled();
    });
  });

  describe('reloadHandler', () => {
    it('does not call manage when no depot is selected', () => {
      component.depots = mockDepots;
      component.depotSelected = undefined as any;
      mockFileImportExportService.manage.calls.reset();

      component.reloadHandler();

      expect(mockFileImportExportService.manage).not.toHaveBeenCalled();
    });

    it('does not update the data source when the response status is not 200', () => {
      component.depots = mockDepots;
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

  describe('mapData', () => {
    it('resolves the depot name when the depot is found', () => {
      component.depots = mockDepots;
      const result = component.mapData({ param_depot_id: 1 });
      expect(result.depot).toBe('Depot A');
    });

    it('falls back to an empty string when the depot is not found', () => {
      component.depots = mockDepots;
      const result = component.mapData({ param_depot_id: 999 });
      expect(result.depot).toBe('');
    });
  });

  describe('sortHandler', () => {
    it('resets sort order and page when direction is cleared', () => {
      spyOn(component, 'reloadHandler');
      const sort: Sort = { active: 'param_file_id', direction: '' };

      component.sortHandler(sort);

      expect(component.params.sort_order).toEqual([]);
      expect(component.currentPage).toBe(1);
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('maps a known column to its backend field name and sets desc true for descending sort', () => {
      spyOn(component, 'reloadHandler');
      const sort: Sort = { active: 'status', direction: 'desc' };

      component.sortHandler(sort);

      expect(component.params.sort_order).toEqual([{ name: 'status', desc: true }]);
    });

    it('falls back to the raw column name and sets desc false for ascending sort', () => {
      spyOn(component, 'reloadHandler');
      const sort: Sort = { active: 'unknown_column', direction: 'asc' };

      component.sortHandler(sort);

      expect(component.params.sort_order).toEqual([
        { name: 'unknown_column', desc: false },
      ]);
    });
  });

  describe('hiddenHandler', () => {
    it('returns the chk value for a known field', () => {
      const field = component.headerData[0].field;
      expect(component.hiddenHandler(field)).toBe(component.headerData[0].chk);
    });

    it('returns false for an unknown field', () => {
      expect(component.hiddenHandler('does_not_exist')).toBeFalse();
    });
  });

  describe('export', () => {
    beforeEach(() => {
      component.selection = [mockExportData[0]] as any;
    });

    it('extracts grp_identifier_id values and reloads when status is 200', () => {
      mockFileImportExportService.exportFileRequest.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            param_export_files: [
              { grp_identifier_id: 'GRP-1' },
              { grp_identifier_id: '' },
              { grp_identifier_id: null },
            ],
            param_file_export_entity_pgn: [mockExportData[0]],
          },
        } as any)
      );
      spyOn(component, 'reloadHandler');

      component.export();

      expect(component.grpIdentifierIds).toEqual(['GRP-1']);
      expect(component.params.search_select_filter['grp_identifier_id']).toEqual([
        'GRP-1',
      ]);
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('falls back to mapping param_export_files when param_file_export_entity_pgn is absent', () => {
      // When status is not 200/cancelled, export() re-reads storedExportData from
      // localStorage (stubbed to always return null in this suite), so the only
      // way to observe the param_export_files fallback mapping land on
      // storedExportData is via the cancelled-status branch, which assigns the
      // mapped entities directly.
      mockFileImportExportService.exportFileRequest.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            param_export_files: [
              {
                serviceProviderId: 1,
                param_depot_id: 1,
                param_file_id: '',
                param_file_name: 'file.sys',
                param_payload_version: '1',
                param_type: '',
                description: 'desc',
                status: 'CANCELLED',
              },
            ],
          },
        } as any)
      );
      // Use a Subject that never emits for afterClosed(): if it emitted
      // synchronously (e.g. via of(undefined)), the dialog's close handler
      // would run immediately and call cleanupAfterDownload(), which resets
      // storedExportData back to [] before we can assert on it.
      const afterClosed$ = new Subject<unknown>();
      mockDialog.open.and.returnValue({ afterClosed: () => afterClosed$ } as any);

      component.export();

      expect(component.storedExportData).toEqual(
        jasmine.arrayContaining([
          jasmine.objectContaining({ param_file_name: 'file.sys' }),
        ])
      );
    });

    it('stops polling and shows the failed dialog when a cancelled status is present', () => {
      mockFileImportExportService.exportFileRequest.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            param_export_files: [],
            param_file_export_entity_pgn: [
              { ...mockExportData[0], status: 'CANCELLED' },
            ],
          },
        } as any)
      );
      mockDialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);

      component.export();

      expect(mockDialog.open).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('delegates to cleanupAfterDownload', () => {
      spyOn(component as any, 'cleanupAfterDownload').and.callThrough();
      component.cancel();
      expect(component['cleanupAfterDownload']).toHaveBeenCalled();
    });
  });

  describe('openCancelDownloadDialog', () => {
    it('calls cancel when the dialog is confirmed', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
      spyOn(component, 'cancel');

      component.openCancelDownloadDialog();

      expect(component.cancel).toHaveBeenCalled();
    });

    it('does not call cancel when the dialog is dismissed', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
      spyOn(component, 'cancel');

      component.openCancelDownloadDialog();

      expect(component.cancel).not.toHaveBeenCalled();
    });
  });

  describe('onTabChange', () => {
    it('clears selected filters and reloads', () => {
      spyOn(component, 'reloadHandler');
      component.onTabChange();
      expect(mockFilterService.clearSelectedFilters).toHaveBeenCalled();
      expect(component.reloadHandler).toHaveBeenCalled();
    });
  });

  describe('onPageChange', () => {
    it('updates the current page and delegates to the pagination service', () => {
      const event = { page: 3, pageSize: 25 };
      component.onPageChange(event as any);
      expect(component.currentPage).toBe(3);
      expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
    });
  });

  describe('checkAllHandler', () => {
    it('adds only items not already selected when checked', () => {
      component.dataSource = [
        { ...mockExportData[0] },
        { ...mockExportData[1] },
      ] as any;
      component.selection = [mockExportData[0]] as any;

      component.checkAllHandler({ checked: true } as MatCheckboxChange);

      expect(component.selection).toHaveSize(2);
      expect(component.chkAll).toBeTrue();
    });

    it('removes only items from the current page when unchecked', () => {
      component.dataSource = [{ ...mockExportData[0] }] as any;
      component.selection = [mockExportData[0], mockExportData[1]] as any;

      component.checkAllHandler({ checked: false } as MatCheckboxChange);

      expect(component.selection).toEqual([mockExportData[1]] as any);
      expect(component.chkAll).toBeFalse();
    });
  });

  describe('updateCheckAllState (private)', () => {
    it('sets chkAll true when every current-page item is selected', () => {
      component.dataSource = [{ ...mockExportData[0] }] as any;
      component.selection = [mockExportData[0]] as any;

      component['updateCheckAllState']();

      expect(component.chkAll).toBeTrue();
    });

    it('sets chkAll false when dataSource is empty', () => {
      component.dataSource = [];
      component.selection = [];

      component['updateCheckAllState']();

      expect(component.chkAll).toBeFalse();
    });
  });

  describe('normalizeStatus / isFinalStatus / isPendingStatus (private)', () => {
    it('normalizes null, undefined, and mixed-case/whitespace strings', () => {
      expect(component['normalizeStatus'](null)).toBe('');
      expect(component['normalizeStatus'](undefined)).toBe('');
      expect(component['normalizeStatus'](' success ')).toBe('SUCCESS');
    });

    it('treats SUCCESS, SUCCEEDED, EXPORTED, FAILED, and FAIL as final', () => {
      for (const status of ['SUCCESS', 'SUCCEEDED', 'EXPORTED', 'FAILED', 'FAIL']) {
        expect(component['isFinalStatus'](status)).toBeTrue();
      }
    });

    it('treats PENDING and unknown statuses as not final', () => {
      expect(component['isFinalStatus']('PENDING')).toBeFalse();
      expect(component['isFinalStatus']('SOMETHING_ELSE')).toBeFalse();
    });

    it('identifies pending status case-insensitively', () => {
      expect(component['isPendingStatus']('pending')).toBeTrue();
      expect(component['isPendingStatus']('SUCCESS')).toBeFalse();
    });
  });

  describe('isSameExportItem (private)', () => {
    it('returns true when file id, version, and depot all match', () => {
      expect(
        component['isSameExportItem'](mockExportData[0], { ...mockExportData[0] })
      ).toBeTrue();
    });

    it('returns false when any identifying field differs', () => {
      expect(
        component['isSameExportItem'](mockExportData[0], mockExportData[1])
      ).toBeFalse();
    });
  });

  describe('refreshCurrentTableStatus (private)', () => {
    it('does nothing when dataSource or storedExportData is not an array', () => {
      component.dataSource = undefined as any;
      component.storedExportData = [mockExportData[0]];

      expect(() => component['refreshCurrentTableStatus']()).not.toThrow();
    });

    it('leaves rows unchanged when there is no matching stored item', () => {
      component.dataSource = [{ ...mockExportData[1], status: 'PENDING' }] as any;
      component.storedExportData = [{ ...mockExportData[0], status: 'SUCCESS' }];

      component['refreshCurrentTableStatus']();

      expect(component.dataSource[0].status).toBe('PENDING');
    });

    it('updates status, description and isLoading from the matched stored item', () => {
      component.dataSource = [{ ...mockExportData[0], status: 'PENDING' }] as any;
      component.storedExportData = [
        { ...mockExportData[0], status: 'PENDING', description: 'updated desc' },
      ];

      component['refreshCurrentTableStatus']();

      expect(component.dataSource[0].status).toBe('PENDING');
      expect(component.dataSource[0].description).toBe('updated desc');
      expect(component.dataSource[0].isLoading).toBeTrue();
    });
  });

  describe('tryOpenExportReadyDialog (private)', () => {
    it('does not open the dialog when it is already shown', () => {
      component.isParameterReadDialogShown = true;
      component.storedExportData = [{ ...mockExportData[0], status: 'SUCCESS' }];
      spyOn(component, 'parameterReady');

      component['tryOpenExportReadyDialog']();

      expect(component.parameterReady).not.toHaveBeenCalled();
    });

    it('does not open the dialog when storedExportData is empty', () => {
      component.isParameterReadDialogShown = false;
      component.storedExportData = [];
      spyOn(component, 'parameterReady');

      component['tryOpenExportReadyDialog']();

      expect(component.parameterReady).not.toHaveBeenCalled();
    });

    it('does not open the dialog when not every item has a final status', () => {
      component.isParameterReadDialogShown = false;
      component.storedExportData = [
        { ...mockExportData[0], status: 'SUCCESS' },
        { ...mockExportData[1], status: 'PENDING' },
      ];
      spyOn(component, 'parameterReady');

      component['tryOpenExportReadyDialog']();

      expect(component.parameterReady).not.toHaveBeenCalled();
    });

    it('opens the dialog when every item has reached a final status', () => {
      component.isParameterReadDialogShown = false;
      component.storedExportData = [{ ...mockExportData[0], status: 'SUCCESS' }];
      spyOn(component, 'parameterReady');

      component['tryOpenExportReadyDialog']();

      expect(component.parameterReady).toHaveBeenCalled();
    });
  });

  describe('getDisplayStatus', () => {
    it('returns "-" for an empty/undefined status', () => {
      expect(component.getDisplayStatus(undefined)).toBe('-');
      expect(component.getDisplayStatus('')).toBe('-');
    });

    it('returns "Exporting..." for PENDING', () => {
      expect(component.getDisplayStatus('pending')).toBe('Exporting...');
    });

    it('returns "Success" for SUCCESS/SUCCEEDED/EXPORTED', () => {
      expect(component.getDisplayStatus('success')).toBe('Success');
      expect(component.getDisplayStatus('succeeded')).toBe('Success');
      expect(component.getDisplayStatus('exported')).toBe('Success');
    });

    it('returns "Failed" for FAILED/FAIL', () => {
      expect(component.getDisplayStatus('failed')).toBe('Failed');
      expect(component.getDisplayStatus('fail')).toBe('Failed');
    });

    it('returns "-" for CANCELLED', () => {
      expect(component.getDisplayStatus('cancelled')).toBe('-');
    });

    it('returns the raw status for an unrecognized value', () => {
      expect(component.getDisplayStatus('WEIRD_STATUS')).toBe('WEIRD_STATUS');
    });
  });

  describe('getStatusClass', () => {
    it('returns an empty string when status is falsy', () => {
      expect(component.getStatusClass(undefined)).toBe('');
    });

    it('returns the exporting class for PENDING', () => {
      expect(component.getStatusClass('pending')).toBe('status-badge exporting');
    });

    it('returns the failed class for FAILED/FAIL', () => {
      expect(component.getStatusClass('failed')).toBe('status-badge failed');
      expect(component.getStatusClass('fail')).toBe('status-badge failed');
    });

    it('returns the success class for SUCCESS/EXPORTED/SUCCEEDED', () => {
      expect(component.getStatusClass('success')).toBe('status-badge success');
    });

    it('returns an empty string for an unrecognized status', () => {
      expect(component.getStatusClass('WEIRD_STATUS')).toBe('');
    });
  });

  describe('containsCancelledStatus (private)', () => {
    it('returns false for an undefined list', () => {
      expect(component['containsCancelledStatus'](undefined)).toBeFalse();
    });

    it('returns true when a CANCELLED entity is present', () => {
      expect(
        component['containsCancelledStatus']([
          { ...mockExportData[0], status: 'CANCELLED' },
        ])
      ).toBeTrue();
    });

    it('returns false when no entity is cancelled', () => {
      expect(
        component['containsCancelledStatus']([
          { ...mockExportData[0], status: 'SUCCESS' },
        ])
      ).toBeFalse();
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

  describe('sortSelectedItemsToTop (private)', () => {
    it('does nothing when dataSource is empty', () => {
      component.dataSource = [];
      component.selection = [mockExportData[0]] as any;
      expect(() => component['sortSelectedItemsToTop']()).not.toThrow();
    });

    it('does nothing when selection is empty', () => {
      component.dataSource = [{ ...mockExportData[0] }] as any;
      component.selection = [];
      const original = [...component.dataSource];
      component['sortSelectedItemsToTop']();
      expect(component.dataSource).toEqual(original);
    });

    it('moves selected items to the top of the data source', () => {
      component.dataSource = [
        { ...mockExportData[1] },
        { ...mockExportData[0] },
      ] as any;
      component.selection = [mockExportData[0]] as any;

      component['sortSelectedItemsToTop']();

      expect(component.dataSource[0].param_file_id).toBe(
        mockExportData[0].param_file_id
      );
    });
  });

  describe('updateDataSource', () => {
    it('trusts the API final status over a stale stored PENDING status and persists the change', () => {
      component.storedExportData = [{ ...mockExportData[0], status: 'PENDING' }];
      component.selection = [];

      component.updateDataSource({
        param_file_export_entity_pgn: [
          { ...mockExportData[0], status: 'SUCCESS' },
        ],
        records_count: 1,
      });

      expect(component.dataSource[0].status).toBe('SUCCESS');
      expect(component.dataSource[0].isLoading).toBeFalse();
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('falls back to the stored status when the API status is not final', () => {
      component.storedExportData = [{ ...mockExportData[0], status: 'PENDING' }];
      component.selection = [];

      component.updateDataSource({
        param_file_export_entity_pgn: [{ ...mockExportData[0], status: undefined }],
        records_count: 1,
      });

      expect(component.dataSource[0].status).toBe('PENDING');
      expect(component.dataSource[0].isLoading).toBeTrue();
    });

    it('defaults to an empty payload array when param_file_export_entity_pgn is missing', () => {
      component.storedExportData = [];
      component.updateDataSource({ records_count: 0 });
      expect(component.dataSource).toEqual([]);
    });

    it('marks matching rows checked based on the current selection', () => {
      component.storedExportData = [];
      component.selection = [mockExportData[0]] as any;

      component.updateDataSource({
        param_file_export_entity_pgn: [mockExportData[0], mockExportData[1]],
        records_count: 2,
      });

      expect(component.dataSource.find(x => x.param_file_id === '0x001')?.chk).toBeTrue();
      expect(component.dataSource.find(x => x.param_file_id === '0x002')?.chk).toBeFalse();
    });
  });
});
