import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { BreadcrumbsComponent } from '@app/components/layout/breadcrumbs/breadcrumbs.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import {
  DropdownList,
  IHeader,
  IPaginationEvent,
  IParams,
  TDate,
} from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { IDagwParameterSummary } from '@app/models/parameter-management';
import { DagwParameterSummaryService } from '@app/services/dagw-parameter-summary.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';

import DawgParameterSummaryHeader from '@data/dawg-parameter-summary-header.json';
import { combineLatest, Observable, of, Subject, takeUntil } from 'rxjs';
import { CommonService } from '@app/services/common.service';

@Component({
  selector: 'app-dawg-parameter-summary',
  imports: [
    BreadcrumbsComponent,
    MatTableModule,
    MatCardModule,
    MatToolbarModule,
    MatTabsModule,
    MatMenuModule,
    MatDividerModule,
    MatSortModule,
    CommonModule,
    PaginationComponent,
    FilterComponent,
    SelectedFilterComponent,
  ],
  providers: [DatePipe, AsyncPipe],
  templateUrl: './dagw-parameter-summary.component.html',
  styleUrl: './dagw-parameter-summary.component.scss',
})
export class DagwParameterSummaryComponent implements OnInit, OnDestroy {
  paginatedData$: Observable<any[]> = of([]);
  depots: IDepoList[] = [];
  chkAll: boolean = false;
  dataSource: IDagwParameterSummary[] = [];

  selection: IDagwParameterSummary[] = [];
  rowCount: number = 0;
  currentPage: number = 1;

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id_list: [],
      consistency_list: [],
      effective_date_live_from: '',
      effective_date_live_till: '',
      effective_date_trial_from: '',
      effective_date_trial_till: '',
    },
  };

  headerData = DawgParameterSummaryHeader;
  tab1Columns: string[] = this.headerData
    .filter(x => !x.hidden)
    .map((x: IHeader) => x.field);

  consistencyOptions: DropdownList[] = [
    { id: '1', value: 'Yes' },
    { id: '0', value: 'No' },
  ];

  filterConfigs: IFilterConfig[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly dagwParameterSummaryService: DagwParameterSummaryService,
    private readonly depoService: DepoService,
    private readonly paginationService: PaginationService,
    private readonly filterService: FilterService,
    private readonly commonService: CommonService
  ) {}

  ngOnInit(): void {
    this.subscribeToDepoChanges();
    this.loadFilterValues();
  }

  ngOnDestroy(): void {
    this.filterService.clearSelectedFilters();
    this.destroy$.next();
    this.destroy$.complete();
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

        const {
          consistency = [],
          effectiveDateLive = [],
          effectiveDateTrial = [],
        } = filterValue || {};

        // Deferred: move filter data manipulation into a service.
        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          depot_id_list: depots,
          consistency_list: consistency,
          effective_date_live_from:
            Array.isArray(effectiveDateLive) && effectiveDateLive.length > 0
              ? new DatePipe('en-US').transform(
                  effectiveDateLive[0],
                  'yyyy-MM-dd HH:mm:ss'
                ) + ''
              : (effectiveDateLive as TDate).startDate || '',
          effective_date_live_till:
            Array.isArray(effectiveDateLive) && effectiveDateLive.length > 1
              ? new DatePipe('en-US').transform(
                  effectiveDateLive[1],
                  'yyyy-MM-dd HH:mm:ss'
                ) + ''
              : (effectiveDateLive as TDate).endDate || '',
          effective_date_trial_from:
            Array.isArray(effectiveDateTrial) && effectiveDateTrial.length > 0
              ? new DatePipe('en-US').transform(
                  effectiveDateTrial[0],
                  'yyyy-MM-dd HH:mm:ss'
                ) + ''
              : (effectiveDateTrial as TDate).startDate || '',
          effective_date_trial_till:
            Array.isArray(effectiveDateTrial) && effectiveDateTrial.length > 1
              ? new DatePipe('en-US').transform(
                  effectiveDateTrial[1],
                  'yyyy-MM-dd HH:mm:ss'
                ) + ''
              : (effectiveDateTrial as TDate).endDate || '',
        };
        this.paginationService.currentPage = 1;
        this.params.page_index = 0;
        this.currentPage = 1;

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
        controlName: 'effectiveDateLive',
        type: 'date-range',
        children: [
          { controlName: 'startDate', value: '' },
          { controlName: 'endDate', value: '' },
        ],
      },
      {
        controlName: 'effectiveDateTrial',
        type: 'date-range',
        children: [
          { controlName: 'startDate', value: '' },
          { controlName: 'endDate', value: '' },
        ],
      },
      {
        controlName: 'consistency',
        value: [],
        type: 'array',
        options: this.consistencyOptions,
      },
    ];

    // Update the filter service with new configs to enable proper filter persistence
    this.filterService.updateFilterConfigs(this.filterConfigs);
  }

  reloadHandler() {
    this.dagwParameterSummaryService.search(this.params).subscribe({
      next: value => {
        if (value.status === 200) {
          this.updateDataSource(value.payload);
        }
      },
    });
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'];
    this.dataSource = payload['dagw_parameter_summary'].map(
      this.mapList.bind(this)
    );
    this.selection = [];
    this.chkAll = false;
  }

  mapList(item: IDagwParameterSummary): IDagwParameterSummary {
    const depot = this.depots.find(_d => _d.depot_id === item.depot_id);
    return <IDagwParameterSummary>{
      ...item,
      depot_name:
        Number.parseInt(item.depot_id) === 0 ? 'All Depot' : depot?.depot_name,
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

  sortHandler(element: Sort) {
    this.params.sort_order = [
      { name: element.active, desc: element.direction != 'asc' },
    ];
    this.reloadHandler();
  }
}
