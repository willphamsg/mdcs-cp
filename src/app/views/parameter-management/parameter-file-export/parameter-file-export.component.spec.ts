import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxChange } from '@angular/material/checkbox';
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
import { of } from 'rxjs';
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
      ['manage', 'exportStatus', 'export']
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

    mockDepoService.depoList$ = of(mockDepots);
    mockFilterService.searchValue$ = of('');
    mockFilterService.filterValues$ = of({});
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockFileImportExportService.manage.and.returnValue(
      of(mockPayloadResponse)
    );

    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'removeItem');

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
});
