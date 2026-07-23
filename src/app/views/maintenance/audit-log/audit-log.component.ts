import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { FilterComponent } from '@app/components/filter/filter.component';
import { BreadcrumbsComponent } from '@app/components/layout/breadcrumbs/breadcrumbs.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { MaintenanceSharedService } from '@app/services/maintenance-shared.service';
import { PaginationService } from '@app/services/pagination.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { DagwParameterSummaryService } from '@app/services/dagw-parameter-summary.service';
import { IDepoList } from '@app/models/depo';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { IHeader, IPaginationEvent, IParams } from '@app/models/common';
import AuditTrailHeader from '@data/audit-trail.json';
import UpdateTypeOptions from '@data/update-type-options.json';
import { CommonService } from '@app/services/common.service';
import { IAuditTrail } from '@app/models/audit-trail';
import { MatSortModule, Sort } from '@angular/material/sort';
import { AuthService } from '@app/services/auth.service';

@Component({
  selector: 'app-audit-log',
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatDividerModule,
    MatTableModule,
    FormsModule,
    CommonModule,
    BreadcrumbsComponent,
    FilterComponent,
    PaginationComponent,
    SelectedFilterComponent,
    MatSortModule,
  ],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogComponent implements OnInit, OnDestroy {
  rowCount: number = 0;
  currentPage: number = 1;
  dataSource: IAuditTrail[] = [];
  headerData = AuditTrailHeader;
  displayedColumns: string[] = this.headerData
    .filter(x => x.hidden == false)
    .map((x: IHeader) => x.field);

  filterConfigs: IFilterConfig[] = [];
  private destroy$ = new Subject<void>();

  params: IParams & {
    // is_regular_expression?: boolean;
    is_case_sensitive?: boolean;
  } = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id: '',
      svc_provider_id: '',
    },
    // is_regular_expression: false,
    is_case_sensitive: false,
  };
  depots: IDepoList[] = [];
  updateTypeOptions = UpdateTypeOptions;
  svcProviderId: number;

  constructor(
    private sharedService: MaintenanceSharedService,
    public paginationService: PaginationService,
    private dagwParameterSummaryService: DagwParameterSummaryService,
    private depoService: DepoService,
    private filterService: FilterService,
    private commonService: CommonService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.depoService.depoList$.subscribe((value: IDepoList[]) => {
      this.depots = value;
    });
  }

  ngOnInit(): void {
    this.svcProviderId = parseInt(this.authService.getSVCProvider()!);
    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      svc_provider_id: this.svcProviderId,
    };
    this.subscribeToDepoChanges();
  }

  ngOnDestroy(): void {
    this.sharedService.updateSelectedDepot(null);
    this.sharedService.resetFormGroup();
    this.filterService.clearSelectedFilters();
    this.destroy$.next();
    this.destroy$.complete();
  }

  hiddenHandler(element: string) {
    return this.headerData.filter(x => x.field == element)[0].chk;
  }

  subscribeToDepoChanges(): void {
    const depotList$ = this.depoService.depoList$;
    const searchValue$ = this.filterService.searchValue$;
    const filterValues$ = this.filterService.filterValues$;

    combineLatest([depotList$, searchValue$, filterValues$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([depotList, searchValue, filterValue]) => {
        this.params.search_text = searchValue;
        this.depots = depotList;

        let depots = filterValue?.['depotsSec'] ?? [];
        if (!Array.isArray(depots) || depots.length === 0) {
          depots = this.commonService.getDepotIds(depotList);
        }

        // Handle other filter values
        const updateType = filterValue?.['updateType'];
        const dateRange = filterValue?.['dateRange'];

        this.params.search_select_filter = {
          svc_provider_id: this.svcProviderId,
          depot_id: depots,
          ...(Array.isArray(updateType) && updateType.length > 0 && { update_type: updateType }),
          ...(dateRange && { date_range: dateRange }),
        };

        // Reset page when new filter/search happens
        this.paginationService.currentPage = 1;
        this.params.page_index = 0;
        this.currentPage = 1;

        this.loadFilterValues();
        this.reloadHandler();
      });
  }

  loadFilterValues(): void {
    this.filterConfigs = [
      {
        controlName: 'depotsSec',
        value: [],
        type: 'array',
        options: this.depots,
      },
      {
        controlName: 'dateRange',
        type: 'date-range',
        children: [
          { controlName: 'startDate', value: '' },
          { controlName: 'endDate', value: '' },
        ],
      },
      {
        controlName: 'updateType',
        value: [],
        type: 'array',
        options: this.updateTypeOptions,
      },
    ];
  }

  reloadHandler(): void {
    if (this.depots) {
      this.sharedService.viewAuditTrail(this.params).subscribe({
        next: value => {
          if (value.status === 200) {
            this.updateDataSource(value.payload);
          }
        },
      });
    }
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'];
    this.dataSource = payload['audit-log-items'].map(
      this.mapDataList.bind(this)
    );
    this.cdr.markForCheck();
  }

  mapDataList(item: IAuditTrail): any {
    const itemDepotId = String(item.depot);
    const depot = this.depots.find(
      _d => String(_d.depot_id) === itemDepotId
    )?.depot_name;

    return <any>{
      ...item,
      depot,
    };
  }

  onPageChange(event: IPaginationEvent): void {
    this.currentPage = event.page;
    this.paginationService.handlePageEvent(
      this.params,
      event,
      this.reloadHandler.bind(this)
    );
  }

  sortHandler(sort: Sort): void {
    this.params.sort_order = [
      { name: sort.active, desc: sort.direction === 'asc' ? false : true },
    ];
    this.reloadHandler();
  }

  onCheckboxChange(): void {
    // Reset to first page when checkbox values change
    this.paginationService.currentPage = 1;
    this.params.page_index = 0;
    this.currentPage = 1;

    // Reload data with updated checkbox values
    this.reloadHandler();
  }
}
