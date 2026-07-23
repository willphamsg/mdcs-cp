import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormsModule } from '@angular/forms';
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
  IActionHistoryParams,
  IHeader,
  IPaginationEvent,
  IParams,
  TDate,
  DepoRequest,
  PayloadResponse,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { INewParameterApproval } from '@models/parameter-trial';
import { ParameterService } from '@app/services/parameter.service';

import { MatDividerModule } from '@angular/material/divider';
import { FilterComponent } from '@app/components/filter/filter.component';
import { MonthFilterComponent, MonthRange } from '@app/components/filter/month-filter/month-filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { FilterService } from '@app/services/filter.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import NewParameterApprovalHeader from '@data/new-parameter-approval-header.json';
import { DepoService } from '@services/depo.service';
import {
  combineLatest,
  Subject,
  takeUntil,
  Subscription,
  debounceTime,
  finalize,
} from 'rxjs';
import { ViewComponent } from '../view/view.component';
import { PaginationService } from '@app/services/pagination.service';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { ParameterSelectionService } from '@app/services/parameter-selection.service';
import { generateUniqueNumberId } from '@app/shared/utils/utils';
import { Store } from '@ngrx/store';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';

const BUFFER_TIME = 30;
@Component({
  selector: 'app-new-parameter-approval-search',
  templateUrl: './new-parameter-approval-search.component.html',
  styleUrls: ['./new-parameter-approval-search.component.scss'],
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
export class NewParameterApprovalSearchComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly datePipe = new DatePipe('en-US');
  private readonly dateFormat = 'yyyy-MM-dd HH:mm:ss';
  private trialSchedulerRateSeconds = 0;
  private statusRefreshTimer$?: Subscription;
  private statusRefreshTimeoutHandle?: ReturnType<typeof setTimeout>;
  private statusRefreshEndTime = 0;
  private pendingParamMasterIds: number[] = [];
  private readonly STATUS_REFRESH_INTERVAL = 5000; // 5 seconds between refresh calls
  private readonly componentId = 'new-parameter-approval-' + Date.now();
  private isDestroyed = false;
  private isTabChanging = false; // Flag to prevent duplicate API calls during tab change
  private readonly inProgressStatusCodes = new Set([
    'PENDING_TO_APPROVE',
    'PENDING_TO_REJECTED',
  ]);

  headerData = NewParameterApprovalHeader;
  chkAll: boolean = false;
  displayedColumns: string[] = NewParameterApprovalHeader.map((x: IHeader) => {
    return x.field;
  });
  options: DropdownList[] = [];

  dataSource: INewParameterApproval[] = [];
  selection: INewParameterApproval[] = [];
  rowCount: number = 0;
  currentPage: number = 1;
  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id: [],
      status: [0],
      svc_prov_id: [],
      effective_date_from: '',
      effective_date_till: '',
    },
  };

  actionHistoryParams: IActionHistoryParams = {
    search_select_filter: {
      status: [2],
      last_updated_start: this.initDefaultMonth().effective_date_from,
      last_updated_end: this.initDefaultMonth().effective_date_till,
    },
    search_text: null,
    sort_order: [{ name: 'last_update', desc: true }],
  };

  // Error check parameters for New Parameter Approval
  errorCheckParams: IActionHistoryParams = {
    search_select_filter: {
      status: [3, 10],
    },
  };

  tabIdx = 0;
  depots: IDepoList[] = [];
  chkGroup: { [key: string]: boolean } = {};
  searchForm: FormGroup;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  filterConfigs: IFilterConfig[] = [];
  svcProviderID: string | null = this.authService.getSVCProvider()!;

  depo: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 100,
    page_index: 0,
    sort_order: [],
  };

  constructor(
    private readonly parameterService: ParameterService,
    private readonly depoService: DepoService,
    private readonly filterService: FilterService,
    private readonly paginationService: PaginationService,
    public readonly authService: AuthService,
    public readonly dialog: MatDialog,
    private readonly commonService: CommonService,
    public readonly selectionService: ParameterSelectionService,
    private readonly store: Store,
    private readonly webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.callTrialSchedulerRateSeconds();

    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      svc_prov_id: [Number.parseInt(this.svcProviderID!, 10)],
    };
    this.subscribeToDepoChanges();

    // Subscribe to selection changes
    this.selectionService.selection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(selections => {
        this.selection = selections;
      });
  }

  callTrialSchedulerRateSeconds(): void {
    this.parameterService
      .getTrialSchedulerRateSeconds()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (value: PayloadResponse) => {
          if (value.status === 200) {
            this.trialSchedulerRateSeconds =
              value?.payload?.rateSeconds + BUFFER_TIME || 0;
          }
        },
        error: error => {
          console.error('Unable to fetch trial scheduler rate seconds:', error);
        },
      });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;

    // Stop all subscriptions and timers immediately
    this.stopStatusRefreshCycle();

    // Clear any remaining subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Clear selections when component is destroyed
    this.selectionService.clearSelections();
  }

  onTabChange(event?: any) {
    // Set flag to prevent combineLatest from calling reloadHandler during tab change
    this.isTabChanging = true;

    // Update tabIdx immediately from event to ensure correct API call
    if (event?.index !== undefined) {
      this.tabIdx = event.index;
    }

    this.filterService.clearSelectedFilters();

    // Clear existing data immediately to show loading state
    this.dataSource = [];
    // Update status based on tab
    if (this.tabIdx === 0) {
      // Action Required tab - status 2
      this.params.search_select_filter = {
        ...this.params.search_select_filter,
        status: [2],
      };
    } else {
      // Action History tab - status 2 for searchHistory
      const range = this.initDefaultMonth();
      this.actionHistoryParams.search_select_filter = {
        ...this.actionHistoryParams.search_select_filter,
        status: [2],
        last_updated_start: range.effective_date_from,
        last_updated_end: range.effective_date_till,
      };
      this.actionHistoryParams.sort_order = [{ name: 'last_update', desc: true }];
    }

    // Reset page when tab changes
    this.paginationService.currentPage = 1;
    this.params.page_index = 0;
    this.currentPage = 1;

    // Clear selections when switching tabs
    this.selectionService.clearSelections();
    this.chkAll = false;
    // Reload data with new status
    this.reloadHandler();

    // Reset flag after a short delay to allow future combineLatest emissions
    setTimeout(() => {
      this.isTabChanging = false;
    }, 150);
  }

  subscribeToDepoChanges(): void {
    combineLatest([
      this.depoService.search(this.depo),
      this.filterService.searchValue$,
      this.filterService.filterValues$,
    ])
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(([depotList, searchValue, filterValue]) => {
        if (this.isTabChanging) {
          return;
        }

        this.updateDepots(depotList);
        this.updateSearchParams(searchValue, filterValue);
        this.resetPagination();
        this.selectionService.clearSelections();
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
    const status = filterValue?.['status'] ?? [2];
    const effectiveDates = this.parseEffectiveDates(
      filterValue?.['effectiveDate']
    );

    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      depot_id: depotIds,
      status: status,
      ...effectiveDates,
    };

    if (this.tabIdx === 1) {
      this.actionHistoryParams.search_select_filter = {
        ...this.actionHistoryParams.search_select_filter,
        depot_id: depotIds,
        status: status,
        ...effectiveDates,
      };
      this.actionHistoryParams.search_text = searchValue || '';
    }
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

    // Update the filter service with new configs to enable proper filter persistence
    this.filterService.updateFilterConfigs(this.filterConfigs);
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
    this.actionHistoryParams.search_select_filter = {
      ...this.actionHistoryParams.search_select_filter,
      last_updated_start: range.effective_date_from,
      last_updated_end: range.effective_date_till,
    };
    if (this.tabIdx === 1) {
      this.resetPagination();
      this.reloadHandler();
    }
  }

  reloadHandler() {
    // Use searchHistory for Action History tab (index 1), regular search for Action Required tab (index 0)
    const searchMethod =
      this.tabIdx === 1
        ? this.parameterService.searchHistory(this.actionHistoryParams)
        : this.parameterService.search(this.params);

    searchMethod.subscribe({
      next: (value: { status: number; payload: any }) => {
        if (value.status === 200) {
          this.updateDataSource(value.payload);
        } else {
          // Handle non-200 status codes
          this.dataSource = [];
          this.rowCount = 0;
          this.selectionService.clearSelections();
          this.chkAll = false;
        }
      },
      error: (error: any) => {
        // Handle API errors
        console.error('Error fetching parameter data:', error);
        this.dataSource = [];
        this.rowCount = 0;
        this.selectionService.clearSelections();
        this.chkAll = false;
      },
    });
  }

  updateDataSource(payload: any): void {
    const isActionHistoryView = this.tabIdx === 1;
    this.rowCount = payload['records_count'];
    const approvalList = payload['new_parameter_approval_list'] || [];
    this.dataSource = approvalList.map((item: any) =>
      this.mapDataSource(item, isActionHistoryView)
    );

    // Restore checkbox state for items that were previously selected
    this.dataSource.forEach(item => {
      item.chk = this.selectionService.isSelected(item.id);
    });

    // Update check all state for current page
    this.updateCheckAllState();
  }

  mapDataSource(item: any, isActionHistoryView = false): INewParameterApproval {
    const depot = this.depots.find(_d => _d.depot_id === item.depot_id);
    const strDepotId = item.depot_id.toString();

    // Use stable ID: param_master_id + depot_id combination for selection persistence
    const uniqueId = generateUniqueNumberId();
    const normalizedStatus =
      isActionHistoryView && this.isInProgressStatus(item.status)
        ? 'In Progress'
        : item.status;

    return <INewParameterApproval>{
      ...item,
      id: uniqueId,
      chk: false,
      svc_prov_id: Number.parseInt(this.svcProviderID!, 10),
      depot_name: strDepotId === '0' ? 'All Depot' : depot?.depot_name,
      param_master_id: item.param_master_id,
      status: normalizedStatus,
    };
  }

  checkHandler(event: MatCheckboxChange, element: INewParameterApproval) {
    // Update element checkbox state
    element.chk = event.checked;

    // Toggle selection in the service
    if (event.checked) {
      this.selectionService.addSelection(element);
    } else {
      this.selectionService.removeSelection(element.id);
    }

    // Update the "check all" state based on current page selections
    this.updateCheckAllState();
  }

  private updateCheckAllState(): void {
    const totalSelectableItems = this.dataSource.length;
    // Count how many items on the current page are selected
    const selectedItemsOnCurrentPage = this.dataSource.filter(item =>
      this.selectionService.isSelected(item.id)
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
      this.selectionService.addMultipleSelections(itemsToAdd);
    } else {
      // Remove only current page items
      const idsToRemove = this.dataSource.map(item => {
        item.chk = false;
        return String(item.id);
      });
      this.selectionService.removeMultipleSelections(idsToRemove);
    }
  }

  sortHandler(element: Sort) {
    if (this.tabIdx == 0) {
      this.params.sort_order = [
        {
          name: element.active,
          desc: element.direction != 'asc',
        },
      ];
    } else if (this.tabIdx == 1) {
      this.actionHistoryParams.sort_order = [
        {
          name: element.active,
          desc: element.direction != 'asc',
        },
      ];
    }
    this.reloadHandler();
  }

  headerHandler(event: MatCheckboxChange, element: IHeader) {
    this.headerData.find(x => x.field == element.field)!.chk =
      event.checked;
  }

  hiddenHandler(element: string) {
    return this.headerData.find(x => x.field == element)!.chk;
  }

  updateView(action: string) {
    // Get all selected items from the service
    const allSelectedItems = this.selectionService.getSelections();
    const paramMasterIds = Array.from(
      new Set(
        allSelectedItems
          .map(item => item.param_master_id)
          .filter((id): id is number => typeof id === 'number')
      )
    );

    const dialogRef = this.dialog.open(ViewComponent, {
      width: '95%',
      height: '70%',
      disableClose: true,
      data: {
        title: `${this.getUpdateViewTitle(action)} Selected`,
        selection: allSelectedItems, // Pass all selected items from the service
        action,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (['approve', 'reject'].includes(action) && result !== 'cancel') {
        // Switch to Action History tab after successful submission
        this.tabIdx = 1;
        // Clear selections after successful approve/reject
        this.selectionService.clearSelections();
        this.reloadHandler();
        this.startStatusRefreshCycle(paramMasterIds);
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

  private getUpdateViewTitle(action: string): string {
    if (action === 'update') {
      return 'Edit';
    }
    if (action === 'reject') {
      return 'Reject';
    }
    return 'Approve';
  }

  private startStatusRefreshCycle(paramMasterIds: number[]): void {
    if (!paramMasterIds.length || this.isDestroyed) {
      return;
    }

    this.stopStatusRefreshCycle(true); // ensure previous cycle finalizes before starting a new one

    this.pendingParamMasterIds = paramMasterIds;

    const refreshWindowSeconds =
      this.trialSchedulerRateSeconds > 0 ? this.trialSchedulerRateSeconds : 1;
    this.statusRefreshEndTime = Date.now() + refreshWindowSeconds * 1000;

    this.statusRefreshTimeoutHandle = setTimeout(() => {
      this.stopStatusRefreshCycle(true);
    }, refreshWindowSeconds * 1000);

    this.statusRefreshTimer$ = this.webSocketService
      .refreshTrigger(
        WS_TOPICS.parameterTrial,
        this.STATUS_REFRESH_INTERVAL,
        true
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const now = Date.now();
        if (now >= this.statusRefreshEndTime) {
          this.stopStatusRefreshCycle(true);
          return;
        }
        this.refreshActionHistoryForPendingIds();
      });
  }

  private refreshActionHistoryForPendingIds(): void {
    if (!this.pendingParamMasterIds.length || this.isDestroyed) {
      return;
    }

    const params: IActionHistoryParams = {
      ...this.actionHistoryParams,
      param_master_ids: this.pendingParamMasterIds,
    };

    this.parameterService.searchHistory(params).subscribe({
      next: value => {
        if (value.status === 200 && this.tabIdx === 1) {
          this.updateDataSource(value.payload);
        }
      },
      error: error => {
        console.error('Failed to refresh action history:', error);
      },
    });
  }

  private stopStatusRefreshCycle(triggerErrorCheck = false): void {
    if (this.statusRefreshTimer$) {
      this.statusRefreshTimer$.unsubscribe();
      this.statusRefreshTimer$ = undefined;
    }

    if (this.statusRefreshTimeoutHandle) {
      clearTimeout(this.statusRefreshTimeoutHandle);
      this.statusRefreshTimeoutHandle = undefined;
    }

    if (triggerErrorCheck && this.pendingParamMasterIds.length > 0) {
      const ids = [...this.pendingParamMasterIds];
      this.pendingParamMasterIds = [];
      this.triggerErrorCheck(ids);
    } else if (!triggerErrorCheck) {
      this.pendingParamMasterIds = [];
    }
  }

  private triggerErrorCheck(paramMasterIds: number[]): void {
    const params: IActionHistoryParams = {
      ...this.errorCheckParams,
      param_master_ids: paramMasterIds,
    };

    this.parameterService
      .searchNewParameterApprovalErrors(params)
      .pipe(finalize(() => this.refreshActionRequiredAndHistory()))
      .subscribe({
        next: value => {
          if (value.status === 200 && value.payload) {
            const errorData =
              value.payload['new_parameter_approval_list'] || [];

            if (Array.isArray(errorData) && errorData.length > 0) {
              this.store.dispatch(
                showSnackbar({
                  message: `Found ${errorData.length} parameter approval error(s). Please check the system.`,
                  title: 'Parameter Approval Error',
                  typeSnackbar: 'error',
                })
              );
            }
          }
        },
        error: error => {
          console.error('Error checking for parameter approval errors:', error);
        },
      });
  }

  private refreshActionRequiredAndHistory(): void {
    this.parameterService
      .search(this.params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          if (value.status === 200 && this.tabIdx === 0) {
            this.updateDataSource(value.payload);
          }
        },
        error: error => {
          console.error('Error refreshing Action Required data:', error);
        },
      });

    this.parameterService
      .searchHistory(this.actionHistoryParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          if (value.status === 200 && this.tabIdx === 1) {
            this.updateDataSource(value.payload);
          }
        },
        error: error => {
          console.error('Error refreshing Action History data:', error);
        },
      });
  }

  isInProgressStatus(status?: string | null): boolean {
    if (!status) {
      return false;
    }
    return this.inProgressStatusCodes.has(status.toUpperCase());
  }
}
