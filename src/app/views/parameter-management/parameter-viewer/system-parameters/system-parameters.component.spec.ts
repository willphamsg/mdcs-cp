import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { PaginationService } from '@app/services/pagination.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { of } from 'rxjs';
import { SystemParametersComponent } from './system-parameters.component';

describe('SystemParametersComponent', () => {
  let component: SystemParametersComponent;
  let fixture: ComponentFixture<SystemParametersComponent>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;

  beforeEach(waitForAsync(() => {
    const paginationSpy = jasmine.createSpyObj('PaginationService', [
      'paginatedData$',
    ]);

    TestBed.configureTestingModule({
      imports: [MatPaginatorModule, MatTableModule, MatSortModule],
      providers: [{ provide: PaginationService, useValue: paginationSpy }],
    }).compileComponents();

    mockPaginationService = TestBed.inject(
      PaginationService
    ) as jasmine.SpyObj<PaginationService>;
    mockPaginationService.paginatedData$ = of([]);

    fixture = TestBed.createComponent(SystemParametersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize paginated data from the service', () => {
    expect(component.paginatedData$).toEqual(
      mockPaginationService.paginatedData$
    );
  });

  it('should load filter values on init', () => {
    const expectedFilterConfigs: IFilterConfig[] = [
      {
        controlName: 'mdcsAccess',
        value: [],
        type: 'array',
        options: [
          { id: '0', value: 'Administrator' },
          { id: '1', value: 'Maintenance Staff' },
          { id: '2', value: 'Not Authorized' },
          { id: '3', value: 'Operator' },
          { id: '4', value: 'Station Supervisor' },
        ],
      },
    ];
    expect(component.filterConfigs).toEqual(expectedFilterConfigs);
  });
});
