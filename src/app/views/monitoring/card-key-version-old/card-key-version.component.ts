import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { IBusTransferList } from '@app/models/bus-transfer';
import { ManageCardKeyVersionService } from '@app/services/card-key-version.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import CardKeyVersionHeader from '@data/card-key-version-header.json';
import { ICardKeyVersion } from '@models/card-key-version';
import {
  IHeader,
  IPaginationEvent,
  IParams,
  PayloadResponse,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { DepoService } from '@services/depo.service';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  Observable,
  of,
  Subject,
  takeUntil,
} from 'rxjs';

import { AgGridAngular } from 'ag-grid-angular';
import type {
  ColDef,
  ColGroupDef,
  GridApi,
  GridReadyEvent,
  INoRowsOverlayComp,
  INoRowsOverlayParams,
  ValueFormatterParams,
  ValueGetterParams,
} from 'ag-grid-community';
import {
  AllCommunityModule,
  ClientSideRowModelModule,
  ModuleRegistry,
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule, ClientSideRowModelModule]);

// Custom No Rows Overlay Component
export class NoDataOverlay implements INoRowsOverlayComp {
  eGui!: HTMLElement;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  init(_params: INoRowsOverlayParams): void {
    this.eGui = document.createElement('div');
    this.eGui.innerHTML = `
      <div class="no-data" style="
        padding: 20px;
        font-weight: 600;
        color: #000;
        font-size: 16px;
      ">
        No Records Found
      </div>
    `;
  }

  getGui(): HTMLElement {
    return this.eGui;
  }
}
@Component({
  selector: 'app-mdcs-card-key-version',
  standalone: true,
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
    MatDividerModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    PaginationComponent,
    AgGridAngular,
  ],
  providers: [MatDatepickerModule],
  templateUrl: './card-key-version.component.html',
  styleUrls: ['./card-key-version.component.scss'],
})
export class ViewCardKeyVersionComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();
  paginatedData$: Observable<IBusTransferList[]> = of([]);

  headerData = CardKeyVersionHeader;
  displayedColumns: string[] = CardKeyVersionHeader.map((x: IHeader) => {
    return x.field;
  });
  rowCount: number = 0;
  currentPage: number = 1;
  searchForm: FormGroup;
  depots: IDepoList[] = [];
  depotSelected: string = '';

  dagwSource: string[] = [];
  dagwVersionStatus: string = '';
  dataSource: ICardKeyVersion[] = [];
  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id_list: [],
      status_list: [],
    },
  };
  chkInconsistent: boolean = false;
  pageSize: number;
  chkGroup: { [key: string]: boolean } = {};

  filterConfigs: any = {};

  searchControl = new FormControl('');

  exampleData: any[] = [];

  rowData = [];

  // Column Definitions: Defines the columns to be displayed.
  colDefs: (ColDef | ColGroupDef)[] = [
    {
      field: 'no',
      headerName: 'No.',
      headerClass: 'ag-center-header',
      valueGetter: params => (params.node?.rowIndex ?? 0) + 1,
      width: 120,
      cellStyle: { 'text-align': 'center' },
      suppressMovable: true,
    },
    {
      field: 'device_id',
      headerName: 'Device ID',
      headerClass: 'ag-center-header',
      width: 220,
      valueGetter: (params: ValueGetterParams) => params.data.device_id.value,
      cellClass: params => params.data.device_id.status || '',
    },
    {
      field: 'time',
      headerName: 'Time Of Reporting',
      headerClass: 'ag-center-header',
      width: 300,
      valueFormatter: (params: ValueFormatterParams) => {
        const date = new Date(params.data.time.value);
        const dateStr = date.toLocaleDateString('en-SG');
        const timeStr = date.toLocaleTimeString('en-SG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        return `${dateStr}\n${timeStr}`;
      },
      cellStyle: {
        'white-space': 'pre-wrap',
        'line-height': '1.3',
        padding: '4px',
      },
    },
    {
      field: 'device_1',
      headerName: 'Device 1',
      headerClass: 'ag-center-header',
      children: [
        {
          field: 'id',
          headerName: 'ID',
          valueGetter: (params: ValueGetterParams) => params.data.device_1.id,
          cellClass: params => params.data.device_1.status || '',
        },
        {
          field: 'ver',
          headerName: 'Ver',
          valueGetter: (params: ValueGetterParams) => params.data.device_1.ver,
          cellClass: params => params.data.device_1.status || '',
        },
      ],
    },
    {
      field: 'device_2',
      headerName: 'Device 2',
      headerClass: 'ag-center-header',
      children: [
        {
          field: 'id',
          headerName: 'ID',
          valueGetter: (params: ValueGetterParams) => params.data.device_2.id,
          cellClass: params => params.data.device_2.status || '',
        },
        {
          field: 'ver',
          headerName: 'Ver',
          valueGetter: (params: ValueGetterParams) => params.data.device_2.ver,
          cellClass: params => params.data.device_2.status || '',
        },
      ],
    },
    {
      field: 'device_3',
      headerName: 'Device 3',
      headerClass: 'ag-center-header',
      children: [
        {
          field: 'id',
          headerName: 'ID',
          valueGetter: (params: ValueGetterParams) => params.data.device_3.id,
          cellClass: params => params.data.device_3.status || '',
        },
        {
          field: 'ver',
          headerName: 'Ver',
          valueGetter: (params: ValueGetterParams) => params.data.device_3.ver,
          cellClass: params => params.data.device_3.status || '',
        },
      ],
    },
    {
      field: 'device_4',
      headerName: 'Device 4',
      headerClass: 'ag-center-header',
      children: [
        {
          field: 'id',
          headerName: 'ID',
          valueGetter: (params: ValueGetterParams) => params.data.device_4.id,
          cellClass: params => params.data.device_4.status || '',
        },
        {
          field: 'ver',
          headerName: 'Ver',
          valueGetter: (params: ValueGetterParams) => params.data.device_4.ver,
          cellClass: params => params.data.device_4.status || '',
        },
      ],
    },
    {
      field: 'device_5',
      headerName: 'Device 5',
      headerClass: 'ag-center-header',
      children: [
        {
          field: 'id',
          headerName: 'ID',
          valueGetter: (params: ValueGetterParams) => params.data.device_5.id,
          cellClass: params => params.data.device_5.status || '',
        },
        {
          field: 'ver',
          headerName: 'Ver',
          valueGetter: (params: ValueGetterParams) => params.data.device_5.ver,
          cellClass: params => params.data.device_5.status || '',
        },
      ],
    },
    {
      field: 'device_6',
      headerName: 'Device 6',
      headerClass: 'ag-center-header',
      children: [
        {
          field: 'id',
          headerName: 'ID',
          valueGetter: (params: ValueGetterParams) => params.data.device_6.id,
          cellClass: params => params.data.device_6.status || '',
        },
        {
          field: 'ver',
          headerName: 'Ver',
          valueGetter: (params: ValueGetterParams) => params.data.device_6.ver,
          cellClass: params => params.data.device_6.status || '',
        },
      ],
    },
  ];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  private gridApi: GridApi;
  private resizeListener: () => void;

  // Grid components
  components = {
    noDataOverlay: NoDataOverlay,
  };

  constructor(
    private readonly manageCardKeyVersionService: ManageCardKeyVersionService,
    private readonly depoService: DepoService,
    private readonly filterService: FilterService,
    private readonly paginationService: PaginationService,
    public readonly dialog: MatDialog
  ) {}

  ngOnInit() {
    this.subscribeToDepoChanges();
    this.loadFilterValues();

    this.searchControl.valueChanges
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe(value => {
        // if (value)
        this.searchText(value);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up resize listener
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  subscribeToDepoChanges(): void {
    const depotList$ = this.depoService.depoList$;
    combineLatest([depotList$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([depotList]) => {
        this.depots = depotList;

        // Reset page when new filter/search happens
        this.paginationService.currentPage = 1;
        this.params.page_index = 0;
        this.currentPage = 1;

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
    ];
  }

  searchText(e: any) {
    this.params.search_text = e;
    this.reloadHandler();
  }

  searchDepot() {
    this.params.search_select_filter['depot_id_list'] = [this.depotSelected];
    this.reloadHandler();
  }

  searchStatus() {
    this.params.search_select_filter['status_list'] = this.chkInconsistent
      ? [1]
      : [];
    this.reloadHandler();
  }

  reloadHandler() {
    this.manageCardKeyVersionService.search(this.params).subscribe({
      next: (value: PayloadResponse) => {
        if (value.status == 200) {
          this.updateDataSource(value.payload);
        }
      },
    });
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'] || 0;
    this.dataSource = payload['card_key_version_list'] || [];

    // Handle DAGW card key version - split by comma and filter out empty values
    if (payload['dagw_card_key_version']?.ver) {
      const dagwVersions = payload['dagw_card_key_version'].ver.split(',');
      this.dagwSource = dagwVersions.filter(
        (v: string) => v && v.trim() !== ''
      );
      this.dagwVersionStatus = payload['dagw_card_key_version'].status || '0';
    } else {
      this.dagwSource = [];
      this.dagwVersionStatus = '0';
    }

    // Transform dataSource to AG Grid format without mutating original
    this.exampleData = (this.dataSource || []).map(item => {
      // Determine bus-level status based on version statuses
      const ver1Status =
        typeof item.ver1 === 'object' && item.ver1 !== null
          ? (item.ver1 as { status?: string }).status
          : undefined;
      const ver2Status =
        typeof item.ver2 === 'object' && item.ver2 !== null
          ? (item.ver2 as { status?: string }).status
          : undefined;
      const ver3Status =
        typeof item.ver3 === 'object' && item.ver3 !== null
          ? (item.ver3 as { status?: string }).status
          : undefined;
      const ver4Status =
        typeof item.ver4 === 'object' && item.ver4 !== null
          ? (item.ver4 as { status?: string }).status
          : undefined;
      const ver5Status =
        typeof item.ver5 === 'object' && item.ver5 !== null
          ? (item.ver5 as { status?: string }).status
          : undefined;
      const ver6Status =
        typeof item.ver6 === 'object' && item.ver6 !== null
          ? (item.ver6 as { status?: string }).status
          : undefined;

      const versionStatuses = new Set([
        ver1Status,
        ver2Status,
        ver3Status,
        ver4Status,
        ver5Status,
        ver6Status,
      ]);
      const hasFailed = versionStatuses.has('2');
      const hasInconsistent = versionStatuses.has('1');
      let busStatus: string | undefined;
      if (hasFailed) {
        busStatus = 'failed';
      } else if (hasInconsistent) {
        busStatus = 'inconsistent';
      }

      return {
        device_id: {
          value: item.bus_num,
          status: busStatus,
        },
        time: { value: this.formatReportTime(item.report_time) },
        device_1: {
          id: String(item.bcv1 || '0'),
          ver: this.getVersionValue(item.ver1),
          status: this.getVersionStatus(item.ver1),
        },
        device_2: {
          id: String(item.bcv2 || '0'),
          ver: this.getVersionValue(item.ver2),
          status: this.getVersionStatus(item.ver2),
        },
        device_3: {
          id: String(item.bcv3 || '0'),
          ver: this.getVersionValue(item.ver3),
          status: this.getVersionStatus(item.ver3),
        },
        device_4: {
          id: String(item.bcv4 || '0'),
          ver: this.getVersionValue(item.ver4),
          status: this.getVersionStatus(item.ver4),
        },
        device_5: {
          id: String(item.bcv5 || '0'),
          ver: this.getVersionValue(item.ver5),
          status: this.getVersionStatus(item.ver5),
        },
        device_6: {
          id: String(item.bcv6 || '0'),
          ver: this.getVersionValue(item.ver6),
          status: this.getVersionStatus(item.ver6),
        },
      };
    });

    // Auto-size columns after data update and refresh grid
    if (this.gridApi) {
      setTimeout(() => {
        // Set row data explicitly to ensure grid updates
        this.gridApi.setGridOption('rowData', this.exampleData);
        this.gridApi.sizeColumnsToFit();
        this.gridApi.refreshCells();
      }, 0);
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    // Set initial row data if available
    if (this.exampleData && this.exampleData.length > 0) {
      this.gridApi.setGridOption('rowData', this.exampleData);
    }
    // Auto-size columns to fit container
    this.gridApi.sizeColumnsToFit();

    // Create and store resize listener
    this.resizeListener = () => {
      setTimeout(() => {
        if (this.gridApi) {
          this.gridApi.sizeColumnsToFit();
        }
      }, 100);
    };

    // Listen for window resize events
    window.addEventListener('resize', this.resizeListener);
  }

  private getVersionValue(version: any): string {
    if (typeof version === 'object' && version !== null) {
      // Handle object with value property
      if (
        version.value !== undefined &&
        version.value !== null &&
        version.value !== ''
      ) {
        return String(version.value);
      }
      return '-';
    }
    // Handle string or other types
    if (version === null || version === undefined || version === '') {
      return '-';
    }
    return String(version);
  }

  private getVersionStatus(version: any): string | undefined {
    if (
      typeof version === 'object' &&
      version !== null &&
      version.status !== undefined
    ) {
      switch (String(version.status)) {
        case '1':
          return 'inconsistent';
        case '2':
          return 'failed';
        case '0':
        default:
          return undefined; // Normal/active status - no special styling
      }
    }
    return undefined;
  }

  private formatReportTime(reportTime: string): string {
    // Handle both ISO format and space-separated format
    // API returns: "2024-11-01 18:42:59"
    // Convert to ISO format for Date parsing
    if (reportTime?.includes(' ')) {
      return reportTime.replace(' ', 'T');
    }
    return reportTime;
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

  removeZeroes(values: string) {
    // Split the string into an array, filter out zeroes, and join back into a string
    return values
      .split(',')
      .filter(value => value !== '00')
      .join(',');
  }
}
