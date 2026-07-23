import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormGroup, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IBustList } from '@models/bus-list';
import {
  DropdownList,
  IHeader,
  IPaginationEvent,
  IParams,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { ManageDailyBusListService } from '@services/manage-daily-bus-list.service';
import { MatDividerModule } from '@angular/material/divider';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { FilterService } from '@app/services/filter.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import BusHeader from '@data/bus-header.json';
import DayType from '@data/day-type.json';
import { DepoService } from '@services/depo.service';
import { combineLatest, Observable, of, Subject, takeUntil } from 'rxjs';
import { ViewComponent } from '../view/view.component';
import { PaginationService } from '@app/services/pagination.service';
import { CommonService } from '@app/services/common.service';
import { AuthService } from '@app/services/auth.service';
import { BusSelectionService } from '@app/services/bus-selection.service';
import { environment } from '@env/environment';

import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';
const POLLING_INTERVAL = 10000;

@Component({
  selector: 'app-search',
  templateUrl: './bus-search.component.html',
  styleUrls: ['./bus-search.component.scss'],
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusSearchComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();
  paginatedData$: Observable<IBustList[]> = of([]);

  headerData = BusHeader;
  chkAll: boolean = false;
  displayedColumns: string[] = BusHeader.map((x: IHeader) => {
    return x.field;
  });
  depots: IDepoList[] = [];

  options: DropdownList[] = [];
  dataSource: IBustList[] = [];

  selection: IBustList[] = [];
  rowCount: number = 0;
  currentPage: number = 1;

  // Deferred: create base component for pagination.
  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id_list: [],
      day_type_list: [],
      bus_num: '',
      service_num: '',
    },
  };

  filteredOptions: DropdownList[] = [];
  pageSize: number;

  chkGroup: { [key: string]: boolean } = {};
  operators: DropdownList[] = [
    { id: '1', value: 'SBSTransit' },
    { id: '2', value: 'Go Ahead Singapore' },
  ];
  statuses: DropdownList[] = [
    { id: 'approved', value: 'Approved' },
    { id: 'rejected', value: 'Rejected' },
  ];

  searchForm: FormGroup;

  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  filterConfigs: IFilterConfig[] = [];

  constructor(
    private readonly manageDailyBusListService: ManageDailyBusListService,
    private readonly depoService: DepoService,
    public dialog: MatDialog,
    private readonly filterService: FilterService,
    public paginationService: PaginationService,
    private readonly cdr: ChangeDetectorRef,
    private readonly commonService: CommonService,
    public authService: AuthService,
    private readonly busSelectionService: BusSelectionService,
    private readonly webSocketService: WebSocketService
  ) {}

  ngOnInit() {
    this.subscribeToDepoChanges();
    this.loadFilterValues();

    this.startAutoRefresh();

    // Subscribe to selection changes
    this.busSelectionService.dailyBusListSelection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(selections => {
        this.selection = selections;
        this.cdr.markForCheck();
      });
  }

  startAutoRefresh(): void {
    this.webSocketService
      .refreshTrigger(WS_TOPICS.masterBusList, POLLING_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('[Daily Bus] refresh triggered:', message);
        this.reloadHandler();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clear selections when component is destroyed
    this.busSelectionService.clearDailyBusListSelections();
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
          dayType = [],
          busId = '',
          serviceNo = '',
        } = {
          dayType: filterValue?.['dayType'],
          busId: filterValue?.['busId'],
          serviceNo: filterValue?.['serviceNo'],
        };

        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          depot_id_list: depots,
          day_type_list: dayType,
          bus_num: Array.isArray(busId) ? busId.join('') : busId,
          service_num: Array.isArray(serviceNo)
            ? serviceNo.join('')
            : serviceNo,
        };

        // Reset page when new filter/search happens
        this.paginationService.currentPage = 1;
        this.params.page_index = 0;
        this.currentPage = 1;

        // Clear selections when filters change
        this.busSelectionService.clearDailyBusListSelections();

        this.reloadHandler();
      });
  }

  loadFilterValues(): void {
    this.options = DayType.map((item: any) => {
      return <DropdownList>{
        id: item.id,
        value: item.value,
      };
    });

    this.filterConfigs = [
      {
        controlName: 'depotsSec',
        value: [],
        type: 'array',
        options: this.depots,
      },
      {
        controlName: 'dayType',
        value: [],
        type: 'array',
        options: this.options,
      },
      // {
      //   controlName: 'serviceNo',
      //   value: [],
      //   type: 'array',
      //   options: this.filteredOptions,
      // },
      // {
      //   controlName: 'serviceNo',
      //   value: '',
      //   type: 'control',
      // },
      // {
      //   controlName: 'busId',
      //   value: '',
      //   type: 'control',
      // },
    ];
  }

  reloadHandler() {
    if (this.depots) {
      this.manageDailyBusListService.search(this.params).subscribe({
        next: value => {
          if (value.status === 200) {
            this.updateDataSource(value.payload);
            this.cdr.markForCheck();
          }
        },
      });
    }
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'];
    this.dataSource = payload['daily_bus_list'].map(this.mapBusList.bind(this));

    // Restore checkbox state for items that were previously selected
    this.dataSource.forEach(item => {
      item.chk = this.busSelectionService.isDailyBusListSelected(item.id);
    });

    // Update check all state for current page
    this.updateCheckAllState();
  }

  mapBusList(item: IBustList): IBustList {
    const depot = this.depots.find(_d => _d.depot_id === item.depot_id);
    return <IBustList>{
      ...item,
      depot_name: depot?.depot_name,
      last_update: item.updated_on,
      day: DayType.find(x => x.id === item.day_type)?.value,
    };
  }

  checkHandler(event: MatCheckboxChange, element: IBustList) {
    // Update element checkbox state
    element.chk = event.checked;

    // Toggle selection in the service
    this.busSelectionService.toggleDailyBusListSelection(
      element,
      event.checked
    );

    // Update the "check all" state based on current page selections
    this.updateCheckAllState();
    this.cdr.markForCheck();
  }

  private updateCheckAllState(): void {
    const totalSelectableItems = this.dataSource.length;
    // Count how many items on the current page are selected
    const selectedItemsOnCurrentPage = this.dataSource.filter(item =>
      this.busSelectionService.isDailyBusListSelected(item.id)
    ).length;

    // Update chkAll based on whether all items on current page are selected
    this.chkAll =
      totalSelectableItems > 0 &&
      selectedItemsOnCurrentPage === totalSelectableItems;
  }

  checkAllHandler(event: MatCheckboxChange): void {
    this.chkAll = event.checked;

    if (event.checked) {
      // Add all current page items
      const itemsToAdd = this.dataSource.map(item => {
        item.chk = true;
        return item;
      });
      this.busSelectionService.addMultipleDailyBusListSelections(itemsToAdd);
    } else {
      // Remove only current page items
      const idsToRemove = this.dataSource.map(item => {
        item.chk = false;
        return String(item.id);
      });
      this.busSelectionService.removeMultipleDailyBusListSelections(
        idsToRemove
      );
    }
    this.cdr.markForCheck();
  }

  sortHandler(element: Sort) {
    this.params.sort_order = [
      { name: element.active, desc: element.direction != 'asc' },
    ];
    this.reloadHandler();
  }

  hiddenHandler(element: string) {
    return this.headerData.find(x => x.field == element).chk;
  }

  openView() {
    const dialogRef = this.dialog.open(ViewComponent, {
      width: '90%',
      height: '70%',
      disableClose: true,
      data: { title: 'Add Bus Entry', action: 'add' },
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
    const allSelectedItems =
      this.busSelectionService.getDailyBusListSelections();

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
      this.busSelectionService.clearDailyBusListSelections();
      if (!environment.useDummyData) {
        this.reloadHandler();
      } else {
        setTimeout(() => {
          this.reloadHandler();
        }, 1000);
      }
      // Clear selections after successful action
    });
  }

  onTabChange() {
    this.filterService.clearSelectedFilters();
    // Clear selections when switching tabs
    this.busSelectionService.clearDailyBusListSelections();
    this.reloadHandler();
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
