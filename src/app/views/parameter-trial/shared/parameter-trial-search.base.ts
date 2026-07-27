import { DatePipe } from '@angular/common';
import { Directive, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatMenuTrigger } from '@angular/material/menu';
import { Sort } from '@angular/material/sort';
import {
  DepoRequest,
  DropdownList,
  IActionHistoryParams,
  IHeader,
  IPaginationEvent,
  IParams,
  PayloadResponse,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { MonthRange } from '@app/components/filter/month-filter/month-filter.component';
import { ParameterSelectionService } from '@app/services/parameter-selection.service';
import { ParameterService } from '@app/services/parameter.service';
import { PaginationService } from '@app/services/pagination.service';
import { Store } from '@ngrx/store';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { WebSocketService } from '@app/services/web-socket.service';
import {
  buildDepotEffectiveDateFilterConfigs,
  getFilteredDepotIds,
  parseEffectiveDates,
} from './parameter-trial-filter.utils';
import { ParameterTrialStatusRefresh } from './parameter-trial-status-refresh';
import { combineLatest, debounceTime, finalize, Subject, takeUntil, Observable } from 'rxjs';

const BUFFER_TIME = 30;

export interface IParameterTrialSearchItem {
  chk: boolean;
  id: string | number;
  depot_id: string | number;
  depot_name: string;
  param_master_id?: number;
}

/**
 * Shared logic for the parameter-trial "search" pages (end-trial,
 * parameter-mode, new-parameter-approval): depot/filter subscription,
 * pagination, selection, tab-driven Action Required/History params, and the
 * ParameterTrialStatusRefresh polling cycle. Subclasses supply the item type
 * and the few points where behavior actually differs (payload key, selection
 * service methods, dialog labels, error-check status codes).
 */
@Directive()
export abstract class ParameterTrialSearchBase<T extends IParameterTrialSearchItem>
  implements OnInit, OnDestroy
{
  protected readonly parameterService = inject(ParameterService);
  protected readonly depoService = inject(DepoService);
  public readonly dialog = inject(MatDialog);
  protected readonly paginationService = inject(PaginationService);
  protected readonly filterService = inject(FilterService);
  public readonly authService = inject(AuthService);
  protected readonly commonService = inject(CommonService);
  public readonly selectionService = inject(ParameterSelectionService);
  protected readonly store = inject(Store);
  protected readonly webSocketService = inject(WebSocketService);

  protected readonly destroy$ = new Subject<void>();
  protected readonly datePipe = new DatePipe('en-US');
  protected readonly dateFormat = 'yyyy-MM-dd HH:mm:ss';
  protected trialSchedulerRateSeconds = 0;
  protected isDestroyed = false;
  protected isTabChanging = false; // Flag to prevent duplicate API calls during tab change

  protected readonly statusRefresh = new ParameterTrialStatusRefresh(
    this.webSocketService,
    this.destroy$,
    () => this.refreshActionHistoryForPendingIds(),
    ids => this.triggerErrorCheck(ids)
  );

  abstract headerData: IHeader[];
  get displayedColumns(): string[] {
    return this.headerData.map((x: IHeader) => x.field);
  }

  chkAll = false;
  options: DropdownList[] = [];
  dataSource: T[] = [];
  selection: T[] = [];
  rowCount = 0;
  currentPage = 1;
  tabIdx = 0;
  depots: IDepoList[] = [];
  pageSize: number;
  chkGroup: { [key: string]: boolean } = {};
  searchForm: FormGroup;
  filterConfigs: IFilterConfig[] = [];
  svcProviderID: string | null = this.authService.getSVCProvider()!;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  depo: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 100,
    page_index: 0,
    sort_order: [],
  };

  abstract params: IParams;
  abstract actionHistoryParams: IActionHistoryParams;
  abstract errorCheckParams: IActionHistoryParams;

  /** Default `status` filter value for both the Action Required and Action History tabs. */
  protected abstract readonly defaultStatus: number[];
  /** Statuses considered "in progress" for badge/class styling. */
  protected abstract readonly inProgressStatusCodes: Set<string>;
  /** Payload key holding the list, used for both normal search and error-check responses. */
  protected abstract readonly listPayloadKey: string;
  /** Lower-case noun used in log/snackbar messages, e.g. "end trial". */
  protected abstract readonly errorItemLabel: string;
  /** Snackbar title used when the error-check finds issues, e.g. "End Trial Error". */
  protected abstract readonly errorSnackbarTitle: string;
  /** Dialog component opened by {@link openParameterTrialDialog}. */
  protected abstract readonly viewDialogComponent: any;

  protected abstract getSelectionObservable(): Observable<T[]>;
  protected abstract addSelection(item: T): void;
  protected abstract removeSelection(id: string | number): void;
  protected abstract isSelected(id: string | number): boolean;
  protected abstract getSelections(): T[];
  protected abstract clearSelections(): void;
  protected abstract addMultipleSelections(items: T[]): void;
  protected abstract removeMultipleSelections(ids: string[]): void;

  abstract mapDataSource(item: any, isActionHistoryView?: boolean): T;
  protected abstract getUpdateViewTitle(action: string): string;
  abstract updateView(action: string): void;
  protected abstract searchActionErrors(
    params: IActionHistoryParams
  ): Observable<PayloadResponse>;

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

  ngOnInit(): void {
    this.callTrialSchedulerRateSeconds();
    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      svc_prov_id: [Number.parseInt(this.svcProviderID!, 10)],
    };
    this.subscribeToDepoChanges();

    this.getSelectionObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(selections => {
        this.selection = selections;
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
    this.clearSelections();
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
        this.clearSelections();
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

  private updateSearchParams(searchValue: string | null, filterValue: any): void {
    this.params.search_text = searchValue || '';

    const depotIds = getFilteredDepotIds(filterValue, this.depots, this.commonService);
    const status = filterValue?.['status'] ?? this.defaultStatus;
    const effectiveDates = parseEffectiveDates(filterValue?.['effectiveDate']);

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

  private resetPagination(): void {
    this.paginationService.currentPage = 1;
    this.params.page_index = 0;
    this.currentPage = 1;
  }

  loadFilterValues(): void {
    this.filterConfigs = buildDepotEffectiveDateFilterConfigs(this.depots);
    this.filterService.updateFilterConfigs(this.filterConfigs);
  }

  protected initDefaultMonth(): MonthRange {
    const currentDate: Date = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59);

    return {
      effective_date_from: this.datePipe.transform(firstDay, this.dateFormat) || '',
      effective_date_till: this.datePipe.transform(lastDay, this.dateFormat) || '',
    };
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

  onTabChange(event?: any): void {
    // Set flag to prevent combineLatest from calling reloadHandler during tab change
    this.isTabChanging = true;

    // Update tabIdx immediately from event to ensure correct API call
    if (event?.index !== undefined) {
      this.tabIdx = event.index;
    }

    this.filterService.clearSelectedFilters();

    // Clear existing data immediately to show loading state
    this.dataSource = [];
    if (this.tabIdx === 0) {
      this.params.search_select_filter = {
        ...this.params.search_select_filter,
        status: this.defaultStatus,
      };
    } else {
      const range = this.initDefaultMonth();
      this.actionHistoryParams.search_select_filter = {
        ...this.actionHistoryParams.search_select_filter,
        status: this.defaultStatus,
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
    this.clearSelections();
    this.chkAll = false;
    // Reload data with new status
    this.reloadHandler();

    // Reset flag after a short delay to allow future combineLatest emissions
    setTimeout(() => {
      this.isTabChanging = false;
    }, 150);
  }

  reloadHandler(): void {
    // Use searchHistory for Action History tab (index 1), regular search for Action Required tab (index 0)
    const searchMethod =
      this.tabIdx === 1
        ? this.parameterService.searchHistory(this.actionHistoryParams)
        : this.parameterService.search(this.params);

    searchMethod.subscribe({
      next: value => {
        if (value.status === 200) {
          this.updateDataSource(value.payload);
        } else {
          this.dataSource = [];
          this.rowCount = 0;
          this.clearSelections();
          this.chkAll = false;
        }
      },
      error: error => {
        console.error(`Error fetching ${this.errorItemLabel} data:`, error);
        this.dataSource = [];
        this.rowCount = 0;
        this.clearSelections();
        this.chkAll = false;
      },
    });
  }

  updateDataSource(payload: any): void {
    const isActionHistoryView = this.tabIdx === 1;
    this.rowCount = payload['records_count'];
    const list = payload[this.listPayloadKey] || [];
    this.dataSource = list.map((item: any) => this.mapDataSource(item, isActionHistoryView));

    // Restore checkbox state for items that were previously selected
    this.dataSource.forEach(item => {
      item.chk = this.isSelected(item.id);
    });

    this.updateCheckAllState();
  }

  checkHandler(event: MatCheckboxChange, element: T): void {
    element.chk = event.checked;

    if (event.checked) {
      this.addSelection(element);
    } else {
      this.removeSelection(element.id);
    }

    this.updateCheckAllState();
  }

  private updateCheckAllState(): void {
    const totalSelectableItems = this.dataSource.length;
    const selectedItemsOnCurrentPage = this.dataSource.filter(item =>
      this.isSelected(item.id)
    ).length;

    this.chkAll =
      totalSelectableItems > 0 && selectedItemsOnCurrentPage === totalSelectableItems;
  }

  checkAllHandler(event: MatCheckboxChange): void {
    this.chkAll = event.checked;

    if (event.checked) {
      const itemsToAdd = this.dataSource.map(item => {
        item.chk = true;
        return item;
      });
      this.addMultipleSelections(itemsToAdd);
    } else {
      const idsToRemove = this.dataSource.map(item => {
        item.chk = false;
        return String(item.id);
      });
      this.removeMultipleSelections(idsToRemove);
    }
  }

  sortHandler(element: Sort): void {
    if (this.tabIdx === 0) {
      this.params.sort_order = [
        { name: element.active, desc: element.direction != 'asc' },
      ];
    } else if (this.tabIdx === 1) {
      this.actionHistoryParams.sort_order = [
        { name: element.active, desc: element.direction != 'asc' },
      ];
    }
    this.reloadHandler();
  }

  headerHandler(event: MatCheckboxChange, element: IHeader): void {
    this.headerData.find(x => x.field == element.field)!.chk = event.checked;
  }

  hiddenHandler(element: string): boolean {
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

  protected extractParamMasterIds(items: T[]): number[] {
    return Array.from(
      new Set(
        items
          .map(item => item.param_master_id)
          .filter((id): id is number => typeof id === 'number')
      )
    );
  }

  /**
   * Opens the shared "update view" dialog for an action, and — if the
   * dialog closes with a result that isn't in `excludedResults` and the
   * action is one of `refreshTriggerActions` — switches to the Action
   * History tab, clears selections, reloads and starts the status-refresh
   * polling cycle for the affected param master IDs.
   */
  protected openParameterTrialDialog(
    action: string,
    selection: T[],
    paramMasterIds: number[],
    refreshTriggerActions: string[],
    excludedResults: string[] = ['cancel'],
    extraData?: Record<string, unknown>
  ): void {
    const dialogRef = this.dialog.open(this.viewDialogComponent, {
      width: '95%',
      height: '70%',
      disableClose: true,
      data: {
        title: `${this.getUpdateViewTitle(action)} Selected`,
        selection,
        action,
        ...extraData,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (
        refreshTriggerActions.includes(action) &&
        !excludedResults.includes(result)
      ) {
        this.tabIdx = 1;
        this.clearSelections();
        this.reloadHandler();
        this.startStatusRefreshCycle(paramMasterIds);
      }
    });
  }

  protected startStatusRefreshCycle(paramMasterIds: number[]): void {
    this.statusRefresh.start(
      paramMasterIds,
      this.trialSchedulerRateSeconds,
      () => this.isDestroyed
    );
  }

  private refreshActionHistoryForPendingIds(): void {
    if (!this.statusRefresh.pendingParamMasterIds.length || this.isDestroyed) {
      return;
    }

    const params: IActionHistoryParams = {
      ...this.actionHistoryParams,
      param_master_ids: this.statusRefresh.pendingParamMasterIds,
    };

    this.parameterService.searchHistory(params).subscribe({
      next: value => {
        if (value.status === 200 && this.tabIdx === 1) {
          this.updateDataSource(value.payload);
        }
      },
      error: error => {
        console.error(`Failed to refresh ${this.errorItemLabel} action history:`, error);
      },
    });
  }

  protected stopStatusRefreshCycle(trigger?: boolean): void {
    this.statusRefresh.stop(trigger);
  }

  private triggerErrorCheck(paramMasterIds: number[]): void {
    const params: IActionHistoryParams = {
      ...this.errorCheckParams,
      param_master_ids: paramMasterIds,
    };

    this.searchActionErrors(params)
      .pipe(finalize(() => this.refreshActionRequiredAndHistory()))
      .subscribe({
        next: value => {
          if (value.status === 200 && value.payload) {
            const errorData = value.payload[this.listPayloadKey] || [];

            if (Array.isArray(errorData) && errorData.length > 0) {
              this.store.dispatch(
                showSnackbar({
                  message: `Found ${errorData.length} ${this.errorItemLabel} error(s). Please check the system.`,
                  title: this.errorSnackbarTitle,
                  typeSnackbar: 'error',
                })
              );
            }
          }
        },
        error: error => {
          console.error(`Error checking for ${this.errorItemLabel} errors:`, error);
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
          console.error(`Error refreshing ${this.errorItemLabel} Action Required data:`, error);
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
          console.error(`Error refreshing ${this.errorItemLabel} Action History data:`, error);
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
