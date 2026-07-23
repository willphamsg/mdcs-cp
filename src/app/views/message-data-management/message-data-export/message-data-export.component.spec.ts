import {
  ComponentFixture,
  TestBed,
  waitForAsync,
} from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { PaginationService } from '@app/services/pagination.service';
import DummyData from '@data/db.json';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { MessageDataExportComponent } from './message-data-export.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DepoService } from '@app/services/depo.service';
import { MessageService } from '@app/services/message.service';
import { CommonService } from '@app/services/common.service';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FilterService } from '@app/services/filter.service';
import { MessageDataImportExportService } from '@app/services/message-data-import-export.service';
import { AuthService } from '@app/services/auth.service';
import { AppConfigService } from '@app/services/app-config.service';

describe('MessageDataExportComponent', () => {
  let component: MessageDataExportComponent;
  let fixture: ComponentFixture<MessageDataExportComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockImportExportService: jasmine.SpyObj<MessageDataImportExportService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockAppConfigService: jasmine.SpyObj<AppConfigService>;

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  const mockDepots: IDepoList[] = DummyData.depot_list;

  const filterServiceSpy = jasmine.createSpyObj('FilterService', [
    'getSelectedFilters',
    'updateFormGroup',
    'clearSelectedFilters',
  ]);

  mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
  mockCommonService = jasmine.createSpyObj('CommonService', ['search']);
  mockPaginationService = jasmine.createSpyObj('PaginationService', [
    'loadData',
    'paginateData',
    'getTotalPages',
    'clearPagination',
    'handlePageEvent',
  ]);
  mockMessageService = jasmine.createSpyObj('MessageService', [
    'MessageResponse',
  ]);

  beforeEach(waitForAsync(() => {
    filterServiceSpy.searchValue$ = of('test');
    filterServiceSpy.filterValues$ = of({ test: ['1'] });
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);
    mockDepoService.depoList$ = of(mockDepots);
    mockMessageService.MessageResponse.and.returnValue(true);
    mockCommonService.search.and.returnValue(of(mockPayloadResponse));

    mockImportExportService = jasmine.createSpyObj('MessageDataImportExportService', [
      'manage',
      'resumeMessageExportPolling',
      'getMessageExportProcessSnapshot',
      'clearMessageExportProcessState',
      'startMessageExportPolling',
      'sendMessageExportRequest',
      'export',
    ]);
    mockImportExportService.messageExportProcess$ = of({ isExportInProgress: false }) as any;
    mockImportExportService.resumeMessageExportPolling.and.returnValue(undefined);
    mockImportExportService.getMessageExportProcessSnapshot.and.returnValue({
      isExportInProgress: false,
      dateSelected: null,
      payload: null,
      timedOut: false,
      success: false,
      startedAt: null,
    } as any);
    mockImportExportService.manage.and.returnValue(of(mockPayloadResponse));

    mockAuthService = jasmine.createSpyObj('AuthService', ['isDagw', 'getSVCProvider', 'getToken']);
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.getSVCProvider.and.returnValue('1');
    mockAuthService.getToken.and.returnValue('test-token');

    mockAppConfigService = jasmine.createSpyObj('AppConfigService', ['getConfig']);
    mockAppConfigService.getConfig.and.returnValue('');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FilterService, useValue: filterServiceSpy },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: Store, useValue: mockStore },
        { provide: MessageDataImportExportService, useValue: mockImportExportService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AppConfigService, useValue: mockAppConfigService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageDataExportComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(MessageDataExportComponent).toBeTruthy();
  });

  it('should set filterConfigs in loadFilterValues', () => {
    component.loadFilterValues();

    expect(component.filterConfigs).toHaveSize(1);
    expect(component.filterConfigs[0].controlName).toBe('mdcsAccess');
  });

  it('should load depots on depo change', () => {
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.depots).toEqual(mockDepots);
  });

  it('should call pagination service on page change', () => {
    component.onPageChange({ page: 1, pageSize: 10 });

    expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
    expect(component.params.page_index).toBe(0);
    expect(component.params.page_size).toBe(10);
  });

  it('should call clearSelectedFilters on tabChange', () => {
    spyOn(component, 'reloadHandler');
    component.onTabChange();

    expect(filterServiceSpy.clearSelectedFilters).toHaveBeenCalled();
    expect(component.reloadHandler).toHaveBeenCalled();
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
