import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { FilterComponent } from '@app/components/filter/filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { IHeader, IPaginationEvent, IParams, TDate } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { BreadcrumbsComponent } from '../../breadcrumbs/breadcrumbs.component';
import { EventHistoryService } from '@app/services/event-history.service';
import { IEventHistory } from '@app/models/event-history';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import EventHistoryHeader from '@data/event-history.json';
import { DatePipe } from '@angular/common';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { AuthService } from '@app/services/auth.service';

@Component({
  selector: 'app-event-history',
  standalone: true,
  imports: [
    MatSortModule,
    MatTableModule,
    BreadcrumbsComponent,
    MatCardModule,
    MatIconModule,
    FilterComponent,
    PaginationComponent,
    MatDividerModule,
    SelectedFilterComponent,
    DatePipe,
  ],
  templateUrl: './event-history.component.html',
  styleUrl: './event-history.component.scss',
})
export class EventHistoryComponent implements OnInit, OnDestroy {
  rowCount: number = 0;
  dataSource: IEventHistory[] = [];
  headerData = EventHistoryHeader;
  displayedColumns: string[] = this.headerData
    .filter(x => !x.hidden)
    .map((x: IHeader) => x.field);
  params: IParams = {
    page_size: 50,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id_list: [],
      effective_date_from: '',
      effective_date_till: '',
      serviceProviderCode: this.authService.getSvcProvCode(),
    },
  };
  depots: IDepoList[] = [];
  currentPage: number = 1;

  filterConfigs: IFilterConfig[] = [];
  private destroy$ = new Subject<void>();
  eventHistory: IEventHistory[] = [];

  constructor(
    private readonly cdr: ChangeDetectorRef,
    public readonly paginationService: PaginationService,
    private readonly eventHistoryService: EventHistoryService,
    private readonly filterService: FilterService,
    private readonly commonService: CommonService,
    private readonly depoService: DepoService,
    private readonly authService: AuthService
  ) {}

  ngOnInit() {
    this.subscribeToDepoChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hiddenHandler(element: string) {
    return this.headerData.find(x => x.field == element)!.chk;
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

        let depots = filterValue?.['depots'] ?? [];
        if (!Array.isArray(depots) || depots.length === 0) {
          depots = this.commonService.getDepotIds(depotList);
        }

        const { effectiveDate = [] } = {
          effectiveDate: filterValue?.['effectiveDate'],
        };

        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          depot_id_list: depots,
          effective_date_from:
            Array.isArray(effectiveDate) && effectiveDate.length > 0
              ? new DatePipe('en-US').transform(
                  effectiveDate[0],
                  'yyyy-MM-dd HH:mm:ss'
                ) + ''
              : (effectiveDate as TDate).startDate || '',
          effective_date_till:
            Array.isArray(effectiveDate) && effectiveDate.length > 1
              ? new DatePipe('en-US').transform(
                  effectiveDate[1],
                  'yyyy-MM-dd HH:mm:ss'
                ) + ''
              : (effectiveDate as TDate).endDate || '',
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
  }

  reloadHandler(): void {
    if (this.depots) {
      this.eventHistoryService.search(this.params).subscribe({
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
    this.dataSource = payload['event_history_list'].map(
      this.mapDataList.bind(this)
    );
  }

  mapDataList(item: IEventHistory): any {
    const depot = this.depots.find(
      _d => _d.depot_id == item.depot_id + ''
    )?.depot_name;
    return <any>{
      ...item,
      depot,
    };
  }

  onPageChange(event: IPaginationEvent): void {
    this.currentPage = event.page;
    // Ensure pageSize is a number, not a string
    const pageEvent: IPaginationEvent = {
      page: event.page,
      pageSize:
        typeof event.pageSize === 'string'
          ? Number(event.pageSize)
          : event.pageSize,
    };
    this.paginationService.handlePageEvent(
      this.params,
      pageEvent,
      this.reloadHandler.bind(this)
    );
  }

  sortHandler(sort: Sort): void {
    this.params.sort_order = [
      { name: sort.active, desc: sort.direction !== 'asc' },
    ];
    this.reloadHandler();
  }
}
