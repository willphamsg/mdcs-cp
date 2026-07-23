import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IBusTransferList } from '@models/bus-transfer';
import {
  DropdownList,
  IHeader,
  IPaginationEvent,
  IParams,
  PayloadResponse,
  DepoRequest,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { ManageBusTransferService } from '@services/bus-transfer.service';
import { MatDividerModule } from '@angular/material/divider';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { FilterService } from '@app/services/filter.service';
import { AppStore } from '@app/store/app.state';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import BusTransferHeader from '@data/bus-transfer-header.json';
import { Store } from '@ngrx/store';
import { DepoService } from '@services/depo.service';
import {
  combineLatest,
  distinctUntilChanged,
  forkJoin,
  Observable,
  of,
  Subject,
  takeUntil,
} from 'rxjs';
import { BusTransferViewComponent } from '../view/view.component';
import { CommonService } from '@app/services/common.service';
import { MessageService } from '@app/services/message.service';
import { PaginationService } from '@app/services/pagination.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { AuthService } from '@app/services/auth.service';
import { BusSelectionService } from '@app/services/bus-selection.service';
import { generateUniqueNumberId } from '@app/shared/utils/utils';
import { MonthFilterComponent, MonthRange } from '@app/components/filter/month-filter/month-filter.component';
import { environment } from '@env/environment';

@Component({
  selector: 'app-bus-transfer-search',
  templateUrl: './bus-transfer-search.component.html',
  styleUrls: ['./bus-transfer-search.component.scss'],
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
    MonthFilterComponent,
  ],
  providers: [DatePipe],
})
export class BusTransferSearchComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();
  private readonly datePipe = new DatePipe('en-US');
  private readonly dateFormat = 'yyyy-MM-dd HH:mm:ss';
  paginatedData$: Observable<IBusTransferList[]> = of([]);

  headerData = BusTransferHeader;
  chkAll: boolean = false;
  displayedColumns: string[] = BusTransferHeader.map((x: IHeader) => {
    return x.field;
  });
  dataSource: IBusTransferList[] = [];
  selection: IBusTransferList[] = [];

  rowCount: number = 0;
  currentPage: number = 1;

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      status: [],
      current_depot: [],
      current_operator: [this.authService.getServiceProviderId()],
      future_operator: [],
    },
  };

  depo: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 100,
    page_index: 0,
    sort_order: [],
  };

  tabIdx = 0;
  depots: IDepoList[] = [];
  operators: DropdownList[] = [];
  statuses: DropdownList[] = [
    { id: '1', value: 'Approved' },
    { id: '2', value: 'Rejected' },
    { id: '3', value: 'Completed' },
  ];
  initialLoad: boolean = true;
  pageSize: number;

  statusView: number[] = [];

  filterConfigs: IFilterConfig[] = [];

  isFilterSubscribed: boolean = false;

  // Add client-side sorting properties
  clientSideSort: {
    active: string | null;
    direction: 'asc' | 'desc' | '';
  } = {
    active: null,
    direction: '',
  };

  // Columns that require client-side sorting
  clientSortColumns = ['current_depot', 'future_depot'];

  constructor(
    private readonly manageBusTransferService: ManageBusTransferService,
    private readonly depoService: DepoService,
    private readonly commonService: CommonService,
    private readonly messageService: MessageService,
    public dialog: MatDialog,
    private readonly store: Store<AppStore>,
    public paginationService: PaginationService,
    private readonly filterService: FilterService,
    public authService: AuthService,
    private readonly busSelectionService: BusSelectionService
  ) {}

  ngOnInit() {
    this.loadDepotsAndOperators();
    this.statusView = [0];
    this.subscribeToDepoChanges();

    // Subscribe to selection changes
    this.busSelectionService.busTransferSelection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(selections => {
        this.selection = selections;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clear selections when component is destroyed
    this.busSelectionService.clearBusTransferSelections();
  }

  loadDepotsAndOperators(): void {
    forkJoin([
      this.commonService.search(this.depo),
      this.depoService.search(this.depo),
    ]).subscribe((value: any) => {
      const resp = this.messageService.MessageResponse(value[0], true);
      this.depots = value[1].payload['depot_info'].filter(
        (item: any) => item.depot_id !== 999
      );

      if (resp) {
        const source = value[0].payload['svc_prov_info'];
        this.operators = source.map((item: any) => ({
          id: item.svc_prov_id,
          value: item.svc_prov_name,
        }));
        this.loadFilterValues();
        this.reloadHandler(); // initial load
      }
    });
  }

  subscribeToDepoChanges(): void {
    combineLatest([
      this.filterService.searchValue$,
      this.filterService.filterValues$,
    ])
      .pipe(
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$)
      )
      .subscribe(([searchValue, filterValue]) => {
        this.params.search_text = searchValue;

        const {
          status = [],
          currDepot = [],
          currOperator = [],
          futureOperator = [],
        } = filterValue || {};

        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          status:
            this.tabIdx === 1 &&
            status &&
            Array.isArray(status) &&
            status.length > 0
              ? status
              : this.statusView,
          current_depot: currDepot,
          current_operator: currOperator,
          future_operator: futureOperator,
        };

        // Clear selections when filters change
        this.busSelectionService.clearBusTransferSelections();

        this.reloadHandler();
      });
  }

  loadFilterValues(): void {
    const baseFilters: IFilterConfig[] = [
      {
        controlName: 'currDepot',
        value: [],
        type: 'array' as const,
        options: this.depots,
      },
      {
        controlName: 'currOperator',
        value: [],
        type: 'array' as const,
        options: this.operators,
      },
      {
        controlName: 'futureOperator',
        value: [],
        type: 'array' as const,
        options: this.operators,
      },
    ];

    if (this.tabIdx === 1) {
      // For Managed Records tab, add Status filter at the beginning
      this.filterConfigs = [
        {
          controlName: 'status',
          value: [],
          type: 'array' as const,
          options: this.statuses,
        },
        ...baseFilters,
      ];
    } else {
      // For Action Required tab, no Status filter
      this.filterConfigs = [...baseFilters];
    }

    // Update the filter service with new configs
    this.filterService.updateFilterConfigs(this.filterConfigs);
  }

  reloadHandler(): void {
    if (this.operators.length > 0) {
      // Only set default service provider ID on initial load
      // After that, respect the filter values set by the user
      if (this.initialLoad) {
        const serviceProviderId = this.authService.getServiceProviderId();
        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          current_operator: [serviceProviderId],
        };
        this.initialLoad = false;
      }

      this.dataSource = [];
      this.manageBusTransferService
        .search(this.params)
        .pipe(takeUntil(this.destroy$))
        .subscribe((value: PayloadResponse) => {
          if (value.status == 200) {
            this.updateDataSource(value.payload);
          }
        });
    }
  }

  // Use in HTML
  getStatus(status: string) {
    switch (status) {
      case '0':
        return 'New';
      case '1':
        return 'Approved';
      case '2':
        return 'Rejected';
      case '3':
        return 'Completed';
      default:
        return '-';
    }
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'];
    const mappedData = payload['bus_transfer_list'].map(
      this.mapBusList.bind(this)
    );
    // Flatten records with multiple depots into separate rows
    this.dataSource = this.flattenBusTransferRecords(mappedData);

    // Restore checkbox state for items that were previously selected
    this.dataSource.forEach(item => {
      item.chk = this.busSelectionService.isBusTransferSelected(item.id);
    });

    // Update check all state for current page
    this.updateCheckAllState();

    // Reapply client-side sorting if active
    if (this.clientSideSort.active && this.clientSideSort.direction) {
      this.applyClientSideSort();
    }
  }

  mapBusList(item: IBusTransferList): IBusTransferList {
    const curDepo = this.depots
      .filter(x => item.current_depot.includes(x.depot_id as any))
      .map(x => x.depot_name);

    const futDepo = this.depots
      .filter(x => item.future_depot.includes(x.depot_id as any))
      .map(x => x.depot_name);
    return {
      ...item,
      chk: false,
      current_depot_name: curDepo.length > 0 ? curDepo : [],
      current_operator_name:
        this.operators.find(x => x.id == item.current_operator)?.value || '',
      future_depot_name: futDepo.length > 0 ? futDepo : [],
      future_operator_name:
        this.operators.find(x => x.id == item.future_operator)?.value || '',
      status_value: this.getStatus(item.status.toString()),
    };
  }

  flattenBusTransferRecords(records: IBusTransferList[]): IBusTransferList[] {
    const flattenedRecords: IBusTransferList[] = [];

    records.forEach(record => {
      const currentDepots = record.current_depot_name || [];
      const futureDepots = record.future_depot_name || [];

      // If both arrays are empty or have single items, create one row
      if (currentDepots.length <= 1 && futureDepots.length <= 1) {
        flattenedRecords.push({
          ...record,
          id: record.id || generateUniqueNumberId(), // Use generateUniqueNumberId
          current_depot_name:
            currentDepots.length > 0 ? [currentDepots[0]] : [''],
          future_depot_name: futureDepots.length > 0 ? [futureDepots[0]] : [''],
          original_bus_id: record.bus_id,
          depot_row_index: 0,
        });
      } else {
        // Create rows for each unique depot combination
        const maxLength = Math.max(currentDepots.length, futureDepots.length);

        for (let i = 0; i < maxLength; i++) {
          flattenedRecords.push({
            ...record,
            id: generateUniqueNumberId(), // Generate unique ID for each row
            // Use the depot at current index, or repeat the last available depot
            current_depot_name:
              currentDepots.length > 0
                ? [currentDepots[Math.min(i, currentDepots.length - 1)]]
                : [''],
            future_depot_name:
              futureDepots.length > 0
                ? [futureDepots[Math.min(i, futureDepots.length - 1)]]
                : [''],
            original_bus_id: record.bus_id,
            depot_row_index: i,
          });
        }
      }
    });

    return flattenedRecords;
  }

  checkHandler(event: MatCheckboxChange, element: IBusTransferList) {
    // Update element checkbox state
    element.chk = event.checked;

    // Toggle selection in the service
    this.busSelectionService.toggleBusTransferSelection(element, event.checked);

    // Update the "check all" state based on current page selections
    this.updateCheckAllState();
  }

  checkAllHandler(event: MatCheckboxChange): void {
    this.chkAll = event.checked;

    if (event.checked) {
      // Add all current page items
      const itemsToAdd = this.dataSource.map(item => {
        item.chk = true;
        return item;
      });
      this.busSelectionService.addMultipleBusTransferSelections(itemsToAdd);
    } else {
      // Remove only current page items
      const idsToRemove = this.dataSource.map(item => {
        item.chk = false;
        return String(item.id);
      });
      this.busSelectionService.removeMultipleBusTransferSelections(idsToRemove);
    }
  }

  private updateCheckAllState(): void {
    const totalSelectableItems = this.dataSource.length;
    // Count how many items on the current page are selected
    const selectedItemsOnCurrentPage = this.dataSource.filter(item =>
      this.busSelectionService.isBusTransferSelected(item.id)
    ).length;

    // Update chkAll based on whether all items on current page are selected
    this.chkAll =
      totalSelectableItems > 0 &&
      selectedItemsOnCurrentPage === totalSelectableItems;
  }

  sortHandler(element: Sort) {
    // Check if this column requires client-side sorting
    if (this.clientSortColumns.includes(element.active)) {
      // Handle client-side sorting
      this.clientSideSort = {
        active: element.active,
        direction: element.direction,
      };
      this.applyClientSideSort();
    } else {
      // Clear client-side sort when using server-side sort
      this.clientSideSort = {
        active: null,
        direction: '',
      };

      // Handle server-side sorting
      this.params.sort_order = [
        {
          name: element.active,
          desc: element.direction != 'asc',
        },
      ];
      this.reloadHandler();
    }
  }

  private applyClientSideSort(): void {
    if (!this.clientSideSort.active || !this.clientSideSort.direction) {
      return;
    }

    const sortColumn = this.clientSideSort.active;
    const isAsc = this.clientSideSort.direction === 'asc';

    this.dataSource = [...this.dataSource].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      if (sortColumn === 'current_depot') {
        // Sort by single depot name since records are now flattened
        aValue = (a.current_depot_name[0] || '').toLowerCase();
        bValue = (b.current_depot_name[0] || '').toLowerCase();
      } else if (sortColumn === 'future_depot') {
        // Sort by single depot name since records are now flattened
        aValue = (a.future_depot_name[0] || '').toLowerCase();
        bValue = (b.future_depot_name[0] || '').toLowerCase();
      } else {
        return 0;
      }

      // Handle empty values - place them at the end
      if (!aValue && !bValue) return 0;
      if (!aValue) return isAsc ? 1 : -1;
      if (!bValue) return isAsc ? -1 : 1;

      // Perform alphabetical comparison
      const comparison = aValue.localeCompare(bValue);
      return isAsc ? comparison : -comparison;
    });
  }

  hiddenHandler(element: string) {
    return this.headerData.find(x => x.field == element).chk;
  }

  private getBusTransferDialogTitle(action: string): string {
    if (action === 'update') {
      return 'Edit';
    }
    return action === 'reject' ? 'Reject' : 'Approve';
  }

  updateView(action: string) {
    // Get all selected items from the service
    const allSelectedItems =
      this.busSelectionService.getBusTransferSelections();

    const dialogRef = this.dialog.open(BusTransferViewComponent, {
      width: '95%',
      height: '70%',
      disableClose: true,
      data: {
        title: `${this.getBusTransferDialogTitle(action)} Bus Transfer`,
        selection: allSelectedItems, // Pass all selected items from the service
        action,
      },
    });

    dialogRef.afterClosed().subscribe(bhv => {
      if (bhv === 'cancel') {
        return;
      }
      this.tabIdx = 0;
      // Clear selections after successful action
      this.busSelectionService.clearBusTransferSelections();
      
      if (!environment.useDummyData) {
        this.reloadHandler();
      } else {
        setTimeout(() => {
          this.reloadHandler();
        }, 1000);
      }
    });
  }

  importHandler(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files?.length) {
      const fileList = target.files;
      const formData = new FormData();

      Array.from(fileList).forEach(file => {
        formData.append('file', file);
      });

      // Reset the input immediately to allow re-importing
      target.value = '';

      this.manageBusTransferService.import(formData).subscribe({
        next: (value: PayloadResponse) => {
          if (value.status == 201) {
            this.store.dispatch(
              showSnackbar({
                message: value.message,
                title: 'Success',
                typeSnackbar: 'success',
              })
            );
          }
          this.reloadHandler();
        },
        error: error => {
          this.store.dispatch(
            showSnackbar({
              message: error.error.error,
              title: 'Error',
              typeSnackbar: 'error',
            })
          );
          console.error('Import error:', error);
        },
      });
    }
  }

  onTabChange() {
    this.filterService.clearSelectedFilters();
    // Clear selections when switching tabs
    this.busSelectionService.clearBusTransferSelections();

    // Reset pagination to default values
    this.params.page_index = 0;
    this.params.page_size = 10;

    // Reset pagination service state - this will force pagination component to reset
    // via the [currentPageInput] and [itemsPerPageInput] bindings
    this.paginationService.currentPage = 1;
    this.paginationService.pageSize = 10;
    this.paginationService.totalItems = 0;

    // Reset row count since different tabs have different data sets
    this.rowCount = 0;

    let sortOrder: Array<{ name: string; desc: boolean }> = [];

    switch (this.tabIdx) {
      case 0:
        this.statusView = [0];
        break;
      case 1: {
        this.statusView = [1, 2, 3];
        const range = this.initDefaultMonth();
        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          last_updated_start: range.effective_date_from,
          last_updated_end: range.effective_date_till,
        };
        sortOrder = [{ name: 'last_update', desc: true }];
        break;
      }
      default:
        this.statusView = [0];
        break;
    }

    this.loadFilterValues();

    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      status: this.statusView,
    };
    this.params.sort_order = sortOrder;
    this.reloadHandler();
  }

  onPageChange(event: IPaginationEvent): void {
    this.paginationService.handlePageEvent(
      this.params,
      event,
      this.reloadHandler.bind(this)
    );
  }
  
  private resetPagination(): void {
    this.paginationService.currentPage = 1;
    this.params.page_index = 0;
    this.currentPage = 1;
  }

  private initDefaultMonth(): MonthRange {
    const currentDate: Date = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59);

    return {
      effective_date_from: this.datePipe.transform(firstDay, this.dateFormat) || '',
      effective_date_till: this.datePipe.transform(lastDay, this.dateFormat) || '',
    }
  }

  onMonthFilterChange(range: MonthRange): void {
    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      last_updated_start: range.effective_date_from,
      last_updated_end: range.effective_date_till,
    };
    if (this.tabIdx === 1) {
      this.resetPagination();
      this.reloadHandler();
    }
  }
}
