import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IDepoList } from '@app/models/depo';
import { AuthService } from '@app/services/auth.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { initialState } from '@app/store/bus.reducer';
import DummyData from '@data/db.json';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { BusOperationSearchComponent } from './bus-operation-search.component';
import { PaginationService } from '@app/services/pagination.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('BusOperationSearchComponent', () => {
  let component: BusOperationSearchComponent;
  let fixture: ComponentFixture<BusOperationSearchComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;
  const filterServiceSpy = jasmine.createSpyObj('FilterService', [
    'getSelectedFilters',
    'updateFormGroup',
    'clearSelectedFilters',
      'updateSearchValue',
  ]);
  mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
  mockPaginationService = jasmine.createSpyObj('PaginationService', [
    'paginatedData$',
    'loadData',
    'paginateData',
    'getTotalPages',
    'clearPagination',
    'handlePageEvent',
  ]);
  mockAuthService = jasmine.createSpyObj('AuthService', [
    'isWebSocketEnabled',
    'wsUrl',
    'getToken',
  ]);

  beforeEach(waitForAsync(() => {
    filterServiceSpy.searchValue$ = of('test');
    filterServiceSpy.filterValues$ = of({ test: ['1'] });

    mockDepoService.depoList$ = of(mockDepots);
    mockAuthService.isWebSocketEnabled.and.returnValue(false);

    TestBed.configureTestingModule({
    imports: [BrowserAnimationsModule],
    providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FilterService, useValue: filterServiceSpy },
        { provide: AuthService, useValue: mockAuthService },
        provideMockStore({ initialState }),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BusOperationSearchComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should set filterConfigs in loadFilterValues', () => {
    component.loadFilterValues();

    expect(component.filterConfigs).toHaveSize(5);
    expect(component.filterConfigs[0].controlName).toBe('depots');
    expect(component.filterConfigs[0].options?.length).toBe(mockDepots.length);
  });

  it('should load depots and call reloadHandler on depo change', () => {
    spyOn(component, 'reloadHandler');

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.depots).toEqual(mockDepots);
    expect(component.reloadHandler).toHaveBeenCalled();
  });

  it('should call pagination service on page change', () => {
    component.onPageChange({ page: 1, pageSize: 10 });

    expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
    expect(component.params.page_index).toBe(0);
    expect(component.params.page_size).toBe(10);
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
