import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { RouterModule } from '@angular/router';
import {
  DropdownList,
  IHeader,
  IPaginationEvent,
  IParams,
  PayloadResponse,
  TDate,
  DepoRequest,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { IParameterVersionSummary } from '@models/parameter-trial';
import { ParameterVersionSummaryService } from '@services/parameter-version-summary.service';

import { MatDividerModule } from '@angular/material/divider';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { FilterService } from '@app/services/filter.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import ParameterVersionSummaryHeader from '@data/parameter-version-summary-header.json';
import { DepoService } from '@services/depo.service';
import { combineLatest, debounceTime, Subject, takeUntil } from 'rxjs';
import { PaginationService } from '@app/services/pagination.service';
import { CommonService } from '@app/services/common.service';

@Component({
  selector: 'app-parameter-version-summary-search',
  templateUrl: './parameter-version-summary-search.component.html',
  styleUrls: ['./parameter-version-summary-search.component.scss'],
  imports: [
    BreadcrumbsComponent,
    // MatPaginator,
    MatSortModule,
    MatCardModule,
    MatDividerModule,
    MatTabsModule,
    MatTableModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    RouterModule,
    FilterComponent,
    PaginationComponent,
    SelectedFilterComponent,
  ],
})
export class ParameterVersionSummarySearchComponent
  implements OnInit, OnDestroy
{
  private destroy$ = new Subject<void>();
  headerData = ParameterVersionSummaryHeader;
  chkAll = false;
  tab1Columns: string[] = ParameterVersionSummaryHeader.map((x: IHeader) => {
    return x.field;
  });
  tab2Columns = [...this.tab1Columns];
  options: DropdownList[] = [];
  rowCount: number = 0;
  currentPage: number = 1;
  dataSource: IParameterVersionSummary[] = [];
  selection: IParameterVersionSummary[] = [];

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id_list: [],
      status_list: [],
      effective_date_from: '',
      effective_date_till: '',
    },
  };

  tabKeys = {
    live_parameters: 'live_parameters',
    trial_parameters: 'trial_parameters',
  };
  tabList = [
    {
      label: 'Live Parameters',
      key: this.tabKeys.live_parameters,
    },
    {
      label: 'Trial Parameters',
      key: this.tabKeys.trial_parameters,
    },
  ];

  tabIdx = 0;
  depots: IDepoList[] = [];
  operators: DropdownList[] = [
    { id: '1', value: 'SBSTransit' },
    { id: '2', value: 'Go Ahead Singapore' },
  ];
  statuses: DropdownList[] = [
    { id: 'approved', value: 'Approved' },
    { id: 'rejected', value: 'Rejected' },
  ];

  pageSize: number;
  chkGroup: { [key: string]: boolean } = {};
  searchForm: FormGroup;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  filterConfigs: IFilterConfig[] = [];

  depo: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 100,
    page_index: 0,
    sort_order: [],
  };

  constructor(
    private readonly parameterVersionSummaryService: ParameterVersionSummaryService,
    private readonly depoService: DepoService,
    private readonly filterService: FilterService,
    private readonly paginationService: PaginationService,
    public readonly dialog: MatDialog,
    private readonly commonService: CommonService
  ) {}

  ngOnInit() {
    this.subscribeToDepoChanges();
    this.loadFilterValues();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(): void {
    this.filterService.clearSelectedFilters();
    this.loadFilterValues();
    this.reloadHandler();
  }

  subscribeToDepoChanges(): void {
    combineLatest([
      this.depoService.search(this.depo),
      this.filterService.searchValue$,
      this.filterService.filterValues$,
    ])
      // Filter updates can emit multiple times synchronously (e.g. date-range),
      // so coalesce them to a single reload.
      .pipe(debounceTime(0), takeUntil(this.destroy$))
      .subscribe(([depotList, searchValue, filterValue]) => {
        this.updateDepots(depotList);
        this.updateSearchParams(searchValue, filterValue);
        this.resetPagination();
        this.reloadHandler();
      });
  }

  private updateDepots(depotList: any): void {
    const wasEmpty = this.depots.length === 0;
    this.depots = depotList.payload['depot_info']
      .filter((item: any) => item.depot_id !== 999)
      .map((item: any) => ({ ...item, value: item.depot_name }));

    // Only load filter values on initial depot load, not on every update
    if (wasEmpty && this.depots.length > 0) {
      this.loadFilterValues();
    }
  }

  private updateSearchParams(
    searchValue: string | null,
    filterValue: any
  ): void {
    this.params.search_text = searchValue || '';

    const depotIds = this.getFilteredDepotIds(filterValue);
    const statusList = this.getStatusList(filterValue);

    const effectiveDates = this.parseEffectiveDates(
      filterValue?.['effectiveDate']
    );

    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      depot_id_list: depotIds,
      status_list: statusList,
      ...effectiveDates,
    };
  }

  private getFilteredDepotIds(filterValue: any): any[] {
    const depots = filterValue?.['depots'] ?? [];
    return Array.isArray(depots) && depots.length > 0
      ? depots
      : this.commonService.getDepotIds(this.depots);
  }

  private parseEffectiveDates(effectiveDate: any): {
    effective_date_from: string;
    effective_date_till: string;
  } {
    const datePipe = new DatePipe('en-US');
    const dateFormat = 'yyyy-MM-dd HH:mm:ss';

    let effective_date_from = '';
    let effective_date_till = '';

    if (Array.isArray(effectiveDate)) {
      if (effectiveDate.length > 0) {
        effective_date_from =
          datePipe.transform(effectiveDate[0], dateFormat) || '';
      }
      if (effectiveDate.length > 1) {
        effective_date_till =
          datePipe.transform(effectiveDate[1], dateFormat) || '';
      }
    } else if (effectiveDate) {
      effective_date_from = (effectiveDate as TDate).startDate || '';
      effective_date_till = (effectiveDate as TDate).endDate || '';
    }

    return { effective_date_from, effective_date_till };
  }

  private getStatusList(filterValue: any): number[] {
    // Trial Parameters tab does not use status filter
    if (this.tabIdx !== 0) {
      return [];
    }

    const rawStatus = filterValue?.['status'];

    // app-filter may return [] when cleared
    const selectedStatus = Array.isArray(rawStatus)
      ? rawStatus[0]
      : rawStatus;

    // No status selected = show both Active and Inactive
    if (
      selectedStatus === undefined ||
      selectedStatus === null ||
      selectedStatus === ''
    ) {
      return [0, 1];
    }

    const statusNumber = Number(selectedStatus);

    // Safety fallback
    if (Number.isNaN(statusNumber)) {
      return [0, 1];
    }

    return [statusNumber];
  }

  private resetPagination(): void {
    this.paginationService.currentPage = 1;
    this.params.page_index = 0;
    this.currentPage = 1;
  }

  loadFilterValues(): void {
    this.filterConfigs = [
      {
        controlName: 'depots',
        value: [],
        type: 'array',
        options: this.depots,
      },
      {
        controlName: 'effectiveDate',
        type: 'date-range',
        children: [
          { controlName: 'startDate', value: '' },
          { controlName: 'endDate', value: '' },
        ],
      },
    ];

    // Only include Status filter for Live Parameters tab (tabIdx === 0)
    if (this.tabIdx === 0) {
      this.filterConfigs.push({
        controlName: 'status',
        value: [],
        type: 'radio',
        options: [
          { id: '1', value: 'Active' },
          { id: '0', value: 'Inactive' },
        ],
      });
    }

    // Update the filter service with new configs to enable proper filter persistence
    this.filterService.updateFilterConfigs(this.filterConfigs);
  }

  reloadHandler() {
    if (this.depots) {
      let type = '';
      if (this.tabIdx === 0) {
        type = 'live';
        if (
          !this.params.search_select_filter['status_list'] ||
          (Array.isArray(this.params.search_select_filter['status_list']) &&
            this.params.search_select_filter['status_list'].length === 0)
        ) {
          this.params.search_select_filter['status_list'] = [0, 1];
        }
      } else {
        this.params.search_select_filter['status_list'] = [];
        type = 'trial';
      }

      this.parameterVersionSummaryService
        .search(this.params, type)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (value: PayloadResponse) => {
            if (value.status == 200) {
              if (value.status === 200) {
                this.updateDataSource(value.payload);
              }
            }
          },
        });
    }
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'];
    this.dataSource = payload['parameter_version_summary'].map(
      this.mapDataSource.bind(this)
    );
    this.selection = [];
    this.chkAll = false;
  }

  mapDataSource(item: IParameterVersionSummary): IParameterVersionSummary {
    const depot = this.depots.find(_d => _d.depot_id === item.depot_id);
    const strDepotId = item.depot_id.toString();
    return <IParameterVersionSummary>{
      ...item,
      depot_name: strDepotId === '0' ? 'All Depot' : depot?.depot_name,
    };
  }

  sortHandler(element: Sort) {
    this.params.sort_order = [
      { name: element.active, desc: element.direction != 'asc' },
    ];
    this.reloadHandler();
  }

  headerHandler(event: MatCheckboxChange, element: IHeader) {
    this.headerData.find(x => x.field == element.field)!.chk =
      event.checked;
  }

  hiddenHandler(element: string) {
    return this.headerData.find(x => x.field == element)!.chk;
  }

  onPageChange(event: IPaginationEvent): void {
    this.currentPage = event.page;
    this.paginationService.handlePageEvent(
      this.params,
      event,
      this.reloadHandler.bind(this)
    );
  }
}
