import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import BusOperationHeader from '@data/bus-operation-header.json';
import {
  DropdownList,
  IHeader,
  IPaginationEvent,
  IParams,
  PayloadResponse,
  TFilter,
} from '@models/common';

import { IBusOperationList } from '@models/bus-operation';
import { IDepoList } from '@models/depo';
import { DepoService } from '@services/depo.service';
import { BusOperationService } from '@services/bus-operation.service';
// import { ViewComponent } from '../view/view.component';
import { RouterModule } from '@angular/router';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { FilterService } from '@app/services/filter.service';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { PaginationService } from '@app/services/pagination.service';

import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';

const POLLING_INTERVAL = 10000;
@Component({
  selector: 'app-mdcs-bus-operation-search',
  imports: [
    BreadcrumbsComponent,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    RouterModule,
    MatCheckboxModule,
    MatSortModule,
    MatMenuModule,
    CommonModule,
    MatDividerModule,
    FormsModule,
    FilterComponent,
    PaginationComponent,
    SelectedFilterComponent,
  ],
  providers: [MatDatepickerModule],
  templateUrl: './bus-operation-search.component.html',
  styleUrls: ['./bus-operation-search.component.scss'],
})
export class BusOperationSearchComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();

  headerData = BusOperationHeader;
  displayedColumns: string[] = BusOperationHeader.map((x: IHeader) => {
    return x.field;
  });
  searchForm: FormGroup;

  options: DropdownList[] = [];

  statusOptions: DropdownList[] = [
    { id: '0', value: 'Failed' },
    { id: '1', value: 'Success' },
    { id: '2', value: 'In Progress' },
    { id: '3', value: '-' },
  ];
  connectStatusOptions: DropdownList[] = [
    { id: '0', value: 'Connect' },
    { id: '1', value: 'Disconnect' },
  ];
  depots: IDepoList[] = [];
  dataSource: IBusOperationList[] = [];
  rowCount: number = 33;
  currentPage: number = 1;

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [{ name: "connect_time", desc: true }],
    search_text: '',
    search_select_filter: {
      depots: [],
      connections: [],
      downloadStatus: [],
      uploadStatus: [],
      authStatus: [],
    },
  };

  pageSize: number;
  filterConfigs: any = {};

  constructor(
    private readonly busOperationService: BusOperationService,
    private readonly depoService: DepoService,
    public dialog: MatDialog,
    public paginationService: PaginationService,
    private readonly filterService: FilterService,
    private readonly webSocketService: WebSocketService
  ) {}

  ngOnInit() {
    this.subscribeToDepoChanges();
    this.loadFilterValues();
    this.startAutoRefresh();
  }

  startAutoRefresh(): void {
    console.log('[Bus Operation] auto refresh started');

    this.webSocketService
      .refreshTrigger(WS_TOPICS.busOperationStatus, POLLING_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('[Bus Operation] refresh triggered:', message);
        this.reloadHandler();
      });
  }

  ngOnDestroy(): void {
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
        const {
          depots = [],
          connection = [],
          download = [],
          upload = [],
          auth = [],
        } = filterValue || {};

        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          depots: depots,
          connections: this.mapConnectionToNumbers(connection),
          downloadStatus: this.mapStatusToNumbers(download),
          uploadStatus: this.mapStatusToNumbers(upload),
          authStatus: this.mapStatusToNumbers(auth),
        };

        // Reset page when new filter/search happens
        this.paginationService.currentPage = 1;
        this.params.page_index = 0;
        this.currentPage = 1;

        this.reloadHandler();
        if (
          this.depots.length > 0 &&
          this.depots?.length !== this.filterConfigs[0]?.options?.length
        )
          this.loadFilterValues();
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
        controlName: 'connection',
        value: [],
        type: 'array',
        options: this.connectStatusOptions,
      },
      {
        controlName: 'download',
        value: [],
        type: 'array',
        options: this.statusOptions,
      },
      {
        controlName: 'upload',
        value: [],
        type: 'array',
        options: this.statusOptions,
      },
      {
        controlName: 'auth',
        value: [],
        type: 'array',
        options: this.statusOptions,
      },
    ];
  }

  reloadHandler() {
    if (this.depots) {
      this.busOperationService.search(this.params).subscribe({
        next: (value: PayloadResponse) => {
          if (value.status === 200) {
            this.updateDataSource(value.payload);
          }
        },
      });
    }
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'];
    // Handle both response formats: bus_operation_status (API) or bus_operation_list (dummy)
    const rawData =
      payload['bus_operation_status'] || payload['bus_operation_list'] || [];
    this.dataSource = rawData.map((item: any) =>
      this.mapBusOperationData(item)
    );
  }

  mapBusOperationData(item: any): any {
    const depot = item.depot || this.depots.find((d) => d.depot_id === item.depot_id);
    return {
      ...item,
      depot,
      download_status: this.mapStatusCode(item.download_status),
      upload_status: this.mapStatusCode(item.upload_status),
      sam_status: this.mapStatusCode(item.sam_status),
      conn_status: item.conn_status === 1 || item.conn_status === true,
      updated_on: item.updated_on || item.updated_time,
      disconnect_time: item.disconnect_time || null, // Some records may not have disconnect time
    };
  }

  mapStatusCode(status: number | string): string {
    // Handle both numeric and string status codes
    if (typeof status === 'string') {
      return status; // Already in correct format (from dummy data)
    }
    // Map numeric status: 0: failed, 1: success, 2: in_progress
    const statusMap: { [key: number]: string } = {
      0: 'failed',
      1: 'success',
      2: 'in_progress',
    };
    return statusMap[status] || '-';
  }

  onPageChange(event: IPaginationEvent): void {
    this.currentPage = event.page;
    this.paginationService.handlePageEvent(
      this.params,
      event,
      this.reloadHandler.bind(this)
    );
  }

  hiddenHandler(element: string) {
    return this.headerData.find(x => x.field == element)!.chk;
  }

  sortHandler(element: Sort) {
    this.params.sort_order = [
      { name: element.active, desc: element.direction != 'asc' },
    ];
    this.reloadHandler();
  }

  mapConnectionToNumbers(connectionValues: TFilter): number[] {
    // Map: 0 = connect, 1 = disconnect
    if (!connectionValues) return [];
    const values = Array.isArray(connectionValues)
      ? connectionValues
      : [connectionValues];
    return values.map(val => {
      const strVal = typeof val === 'string' || typeof val === 'number' ? String(val) : '';
      if (strVal === '0' || strVal === 'connect') return 0;
      if (strVal === '1' || strVal === 'disconnect') return 1;
      return typeof val === 'number' ? val : Number.parseInt(strVal, 10);
    });
  }

  mapStatusToNumbers(statusValues: TFilter): number[] {
    // Map: 0 = failed, 1 = success, 2 = in_progress
    if (!statusValues) return [];
    const values = Array.isArray(statusValues) ? statusValues : [statusValues];
    return values.map(val => {
      const strVal = typeof val === 'string' || typeof val === 'number' ? String(val) : '';
      if (strVal === '0' || strVal === 'failed') return 0;
      if (strVal === '1' || strVal === 'success') return 1;
      if (strVal === '2' || strVal === 'in_progress') return 2;
      return typeof val === 'number' ? val : Number.parseInt(strVal, 10);
    });
  }
}
