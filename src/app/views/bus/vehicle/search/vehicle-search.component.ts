import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { RouterModule } from '@angular/router';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { FilterService } from '@app/services/filter.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import VehicleHeader from '@data/vehicle-header.json';
import {
  DropdownList,
  IHeader,
  IPaginationEvent,
  IParams,
  PayloadResponse,
  TDate,
} from '@models/common';
import VehicleStatus from '@data/vehicle-status.json';
import { IDepoList } from '@models/depo';
import { IVehicleList } from '@models/vehicle-list';
import { DepoService } from '@services/depo.service';
import { MasterService } from '@services/master.service';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { ViewComponent } from '../view/view.component';
import { PaginationService } from '@app/services/pagination.service';
import { environment } from '@env/environment';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { BusSelectionService } from '@app/services/bus-selection.service';
import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';

const POLLING_INTERVAL = 10000;
@Component({
  selector: 'app-search',
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
  templateUrl: './vehicle-search.component.html',
  styleUrls: ['./vehicle-search.component.scss'],
})
export class VehicleSearchComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();
  dagw = this.authService.isDagw();
  headerData = VehicleHeader;
  displayedColumns: string[] = VehicleHeader.map((x: IHeader) => {
    return x.field;
  });
  rowCount: number = 0;
  currentPage: number = 1;
  status: DropdownList[] = [];
  statusOption: DropdownList[] = [];

  depots: IDepoList[] = [];
  selection: IVehicleList[] = [];
  dataSource: IVehicleList[] = [];

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
      bus_num: '',
    },
  };

  chkAll: boolean = false;
  pageSize: number;

  chkGroup: { [key: string]: boolean } = {};

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  filterConfigs: IFilterConfig[] = [];
  constructor(
    public readonly authService: AuthService,
    private readonly masterService: MasterService,
    private readonly depoService: DepoService,
    public readonly dialog: MatDialog,
    private readonly filterService: FilterService,
    public readonly paginationService: PaginationService,
    private readonly commonService: CommonService,
    private readonly busSelectionService: BusSelectionService,
    private readonly webSocketService: WebSocketService
  ) {
    // Deferred: move status mapping out of constructor and cover with tests.
    this.status = VehicleStatus.map((item: any) => {
      return <DropdownList>{
        id: item.id,
        value: item.value,
      };
    });

    this.statusOption = VehicleStatus.map((item: any) => {
      return <DropdownList>{
        id: item.id,
        value: item.value,
      };
    });
  }

  ngOnInit() {
    this.subscribeToDepoChanges();
    this.loadFilterValues();

    // Subscribe to selection changes
    this.busSelectionService.vehicleSelection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(selections => {
        this.selection = selections;
      });

    this.startPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clear selections when component is destroyed
    this.busSelectionService.clearVehicleSelections();
  }

  startPolling(): void {
    this.webSocketService
      .refreshTrigger(WS_TOPICS.masterBusList, POLLING_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.reloadHandler();
      });
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
          // depots = [],
          busId = [],
          status = [],
          effectiveDate = [],
        } = filterValue || {};

        // Deferred: move filter data manipulation into a service.
        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          depot_id_list: depots,
          status_list: status,
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
          // bus_num: Array.isArray(busId) ? busId.join('') : busId,
        };

        // Reset page when new filter/search happens
        this.paginationService.currentPage = 1;
        this.params.page_index = 0;
        this.currentPage = 1;

        // Clear selections when filters change
        this.busSelectionService.clearVehicleSelections();

        this.reloadHandler();

        // if (
        //   this.depots.length > 0 &&
        //   this.depots?.length !== this.filterConfigs[0]?.options?.length
        // )
        //   this.loadFilterValues();
      });
  }

  loadFilterValues(): void {
    this.filterConfigs = [
      // {
      //   controlName: 'busId',
      //   value: '',
      //   type: 'control',
      // },
      {
        controlName: 'effectiveDate',
        type: 'date-range',
        children: [
          { controlName: 'startDate', value: '' },
          { controlName: 'endDate', value: '' },
        ],
      },
      {
        controlName: 'status',
        value: [],
        type: 'array',
        options: this.statusOption,
      },
    ];

    if (!this.dagw) {
      this.filterConfigs = [
        {
          controlName: 'depotsSec',
          value: [],
          type: 'array',
          options: this.depots,
        },
        ...this.filterConfigs,
      ];
    }
  }

  onTabChange() {
    this.filterService.clearSelectedFilters();
    // Clear selections when switching tabs
    this.busSelectionService.clearVehicleSelections();
    this.reloadHandler();
  }

  reloadHandler() {
    if (this.depots) {
      this.masterService.search(this.params).subscribe({
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
    this.dataSource = payload['master_bus_list'].map(
      this.mapBusList.bind(this)
    );

    // Restore checkbox state for items that were previously selected
    this.dataSource.forEach(item => {
      if (item.master_bus_depot_id) {
        item.chk = this.busSelectionService.isVehicleSelected(
          item.master_bus_depot_id
        );
      }
    });

    // Update check all state for current page
    this.updateCheckAllState();
  }

  mapBusList(item: IVehicleList): IVehicleList {
    const depot = this.depots.find(
      _d => _d.depot_id === item.depot_id
    ) as IDepoList;
    return <IVehicleList>{
      ...item,
      depot_name: depot?.depot_name,
      status: this.status.find(x => x.id == item.status)?.value,
      updated_on: item.updated_on,
    };
  }

  checkHandler(event: MatCheckboxChange, element: IVehicleList) {
    // Only process items with master_bus_depot_id
    if (!element.master_bus_depot_id) {
      return;
    }

    // Update element checkbox state
    element.chk = event.checked;

    // Toggle selection in the service
    if (event.checked) {
      this.busSelectionService.addVehicleSelection(element);
    } else {
      const key =
        element.master_bus_depot_id !== undefined
          ? element.master_bus_depot_id
          : element.id;
      this.busSelectionService.removeVehicleSelection(key);
    }

    // Update the "check all" state based on current page selections
    this.updateCheckAllState();
  }

  private updateCheckAllState(): void {
    const itemsWithDepotId = this.dataSource.filter(
      item => item.master_bus_depot_id
    );
    const totalSelectableItems = itemsWithDepotId.length;

    // Count how many items on the current page are selected
    const selectedItemsOnCurrentPage = itemsWithDepotId.filter(item => {
      return this.busSelectionService.isVehicleSelected(
        item.master_bus_depot_id!
      );
    }).length;

    // Update chkAll based on whether all items on current page are selected
    this.chkAll =
      totalSelectableItems > 0 &&
      selectedItemsOnCurrentPage === totalSelectableItems;
  }

  checkAllHandler(event: MatCheckboxChange) {
    this.chkAll = event.checked;

    if (event.checked) {
      // Add all current page items that have master_bus_depot_id
      const itemsToAdd = this.dataSource
        .filter(item => item.master_bus_depot_id)
        .map(item => {
          item.chk = true;
          return item;
        });
      this.busSelectionService.addMultipleVehicleSelections(itemsToAdd);
    } else {
      // Remove only current page items
      const idsToRemove = this.dataSource
        .filter(item => item.master_bus_depot_id)
        .map(item => {
          item.chk = false;
          return String(item.master_bus_depot_id!);
        });
      this.busSelectionService.removeMultipleVehicleSelections(idsToRemove);
    }
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

  openView(action?: string) {
    const dialogRef = this.dialog.open(ViewComponent, {
      height: '70%',
      width: '90%',
      disableClose: true,
      data: {
        title: `Add Bus Entry`,
        action,
      },
    });
    dialogRef.afterClosed().subscribe(() => {
      if (!environment.useDummyData) {
        this.reloadHandler();
      } else {
        setTimeout(() => {
          this.reloadHandler();
        }, 1000);
      }
    });
  }

  updateView(action: string) {
    // Get all selected items from the service
    const allSelectedItems = this.busSelectionService.getVehicleSelections();

    const dialogRef = this.dialog.open(ViewComponent, {
      width: '90%',
      height: '70%',
      disableClose: true,
      data: {
        title: `${action === 'update' ? 'Edit' : 'Delete'} Bus Entry`,
        selection: allSelectedItems, // Pass all selected items from the service
        action,
      },
    });

    dialogRef.afterClosed().subscribe(bhv => {
      if (bhv === 'cancel') {
        return;
      }
      this.busSelectionService.clearVehicleSelections();
      if (!environment.useDummyData) {
        this.reloadHandler();
      } else {
        setTimeout(() => {
          this.reloadHandler();
        }, 1000);
      }
    });
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
