import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IDepoList } from '@app/models/depo';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { initialState } from '@app/store/bus.reducer';
import DummyData from '@data/db.json';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { ViewCardKeyVersionComponent } from './card-key-version.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('ViewCardKeyVersionComponent', () => {
  let component: ViewCardKeyVersionComponent;
  let fixture: ComponentFixture<ViewCardKeyVersionComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;
  const filterServiceSpy = jasmine.createSpyObj('FilterService', [
    'getSelectedFilters',
    'updateFormGroup',
    'clearSelectedFilters',
      'updateSearchValue',
  ]);

  mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
  mockPaginationService = jasmine.createSpyObj('PaginationService', [
    'handlePageEvent',
  ]);

  beforeEach(waitForAsync(() => {
    filterServiceSpy.searchValue$ = of('test');
    filterServiceSpy.filterValues$ = of({ test: ['1'] });

    mockDepoService.depoList$ = of(mockDepots);

    TestBed.configureTestingModule({
    imports: [BrowserAnimationsModule],
    providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FilterService, useValue: filterServiceSpy },
        provideMockStore({ initialState }),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewCardKeyVersionComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
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

  it('should call sort table on call of sort handler', () => {
    component.sortHandler({ active: 'depot', direction: 'asc' });

    expect(component.params.sort_order).toEqual([{ name: 'depot', desc: false }]);
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
