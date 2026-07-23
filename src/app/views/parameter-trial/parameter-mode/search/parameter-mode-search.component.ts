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
  DepoRequest,
  PayloadResponse,
} from '@models/common';
import { IDepoList } from '@models/depo';
import {
  IParameterMode,
  IValidatedParameterStatus,
  IValidateLiveRequest,
  TUserActionType,
} from '@models/parameter-trial';

import { MatDividerModule } from '@angular/material/divider';
import { FilterComponent } from '@app/components/filter/filter.component';
import { MonthFilterComponent, MonthRange } from '@app/components/filter/month-filter/month-filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { FilterService } from '@app/services/filter.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import ParameterModeHeader from '@data/parameter-mode-header.json';
import { DepoService } from '@services/depo.service';
import {
  combineLatest,
  Subject,
  takeUntil,
  debounceTime,
  finalize,
} from 'rxjs';
import { ViewComponent } from '../view/view.component';
import { ParameterService } from '@app/services/parameter.service';
import { PaginationService } from '@app/services/pagination.service';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { ParameterSelectionService } from '@app/services/parameter-selection.service';
import { generateUniqueNumberId } from '@app/shared/utils/utils';
import { Store } from '@ngrx/store';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { WebSocketService } from '@app/services/web-socket.service';
import {
  buildDepotEffectiveDateFilterConfigs,
  getFilteredDepotIds,
  parseEffectiveDates,
} from '../../shared/parameter-trial-filter.utils';
import { ParameterTrialStatusRefresh } from '../../shared/parameter-trial-status-refresh';

const BUFFER_TIME = 30;

@Component({
  selector: 'app-parameter-mode-search',
  templateUrl: './parameter-mode-search.component.html',
  styleUrls: ['./parameter-mode-search.component.scss'],
  providers: [DatePipe],
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
})
export class ParameterModeSearchComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly datePipe = new DatePipe('en-US');
  private readonly dateFormat = 'yyyy-MM-dd HH:mm:ss';
  private trialSchedulerRateSeconds = 0;
  private readonly statusRefresh!: ParameterTrialStatusRefresh;
  private isDestroyed = false;
  private isTabChanging = false; // Flag to prevent duplicate API calls during tab change
  private readonly inProgressStatusCodes = new Set([
    'APPROVE_TO_LIVE',
    'TRIAL_TO_LIVE',
    'TRIAL_TO_REJECTED',
    'APPROVE_TO_TRIAL',
  ]);

  headerData = ParameterModeHeader;
  chkAll: boolean = false;
  displayedColumns: string[] = ParameterModeHeader.map((x: IHeader) => {
    return x.field;
  });
  options: DropdownList[] = [];
  dataSource: IParameterMode[] = [];
  selection: IParameterMode[] = [];
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
      status: [4],
      last_updated_start: this.initDefaultMonth().effective_date_from,
      last_updated_end: this.initDefaultMonth().effective_date_till,
    },
    search_text: null,
    sort_order: [{ name: 'last_update', desc: true }],
  };

  // Error check parameters for Parameter Mode
  errorCheckParams: IActionHistoryParams = {
    search_select_filter: {
      status: [5, 6],
    },
  };

  tabIdx = 0;
  depots: IDepoList[] = [];

  pageSize: number;
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
    public readonly dialog: MatDialog,
    private readonly paginationService: PaginationService,
    private readonly filterService: FilterService,
    public readonly authService: AuthService,
    private readonly commonService: CommonService,
    public readonly selectionService: ParameterSelectionService,
    private readonly store: Store,
    private readonly webSocketService: WebSocketService
  ) {
    this.statusRefresh = new ParameterTrialStatusRefresh(
      this.webSocketService,
      this.destroy$,
      () => this.refreshActionHistoryForPendingIds(),
      ids => this.triggerErrorCheck(ids)
    );
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

  ngOnInit() {
    this.callTrialSchedulerRateSeconds();
    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      svc_prov_id: [Number.parseInt(this.svcProviderID!, 10)],
    };
    this.subscribeToDepoChanges();

    // Subscribe to selection changes
    this.selectionService.parameterModeSelection$
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
    this.selectionService.clearParameterModeSelections();
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
        this.selectionService.clearParameterModeSelections();
        this.reloadHandler();
        // if (
        //   this.depots.length > 0 &&
        //   this.depots?.length !== this.filterConfigs[0]?.options?.length
        // )
        //   this.loadFilterValues();
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

    const depotIds = getFilteredDepotIds(filterValue, this.depots, this.commonService);
    const status = filterValue?.['status'] ?? [4];
    const effectiveDates = parseEffectiveDates(
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


  private resetPagination(): void {
    this.paginationService.currentPage = 1;
    this.params.page_index = 0;
    this.currentPage = 1;
  }

  loadFilterValues(): void {
    this.filterConfigs = buildDepotEffectiveDateFilterConfigs(this.depots);
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

  checkHandler(event: MatCheckboxChange, element: IParameterMode) {
    // Update element checkbox state
    element.chk = event.checked;

    // Toggle selection in the service
    if (event.checked) {
      this.selectionService.addParameterModeSelection(element);
    } else {
      this.selectionService.removeParameterModeSelection(element.id);
    }

    // Update the "check all" state based on current page selections
    this.updateCheckAllState();
  }

  private updateCheckAllState(): void {
    const totalSelectableItems = this.dataSource.length;
    // Count how many items on the current page are selected
    const selectedItemsOnCurrentPage = this.dataSource.filter(item =>
      this.selectionService.isParameterModeSelected(item.id)
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
      this.selectionService.addMultipleParameterModeSelections(itemsToAdd);
    } else {
      // Remove only current page items
      const idsToRemove = this.dataSource.map(item => {
        item.chk = false;
        return String(item.id);
      });
      this.selectionService.removeMultipleParameterModeSelections(idsToRemove);
    }
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
      // Action Required tab - status 4
      this.params.search_select_filter = {
        ...this.params.search_select_filter,
        status: [4],
      };
    } else {
      // Action History tab - status 4 for searchHistory
      const range = this.initDefaultMonth();
      this.actionHistoryParams.search_select_filter = {
        ...this.actionHistoryParams.search_select_filter,
        status: [4],
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
    this.selectionService.clearParameterModeSelections();
    this.chkAll = false;
    // Reload data with new status
    this.reloadHandler();

    // Reset flag after a short delay to allow future combineLatest emissions
    setTimeout(() => {
      this.isTabChanging = false;
    }, 150);
  }

  reloadHandler() {
    if (this.depots) {
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
            // Handle non-200 status codes
            this.dataSource = [];
            this.rowCount = 0;
            this.selectionService.clearParameterModeSelections();
            this.chkAll = false;
          }
        },
        error: error => {
          // Handle API errors
          console.error('Error fetching parameter data:', error);
          this.dataSource = [];
          this.rowCount = 0;
          this.selectionService.clearParameterModeSelections();
          this.chkAll = false;
        },
      });
    }
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'];
    this.dataSource = payload['parameter_mode_list'].map((item: any) =>
      this.mapDataSource(item)
    );

    // Restore checkbox state for items that were previously selected
    this.dataSource.forEach(item => {
      item.chk = this.selectionService.isParameterModeSelected(item.id);
    });

    // Update check all state for current page
    this.updateCheckAllState();
  }

  mapDataSource(item: any): IParameterMode {
    const depot = this.depots.find(_d => _d.depot_id === item.depot_id);
    const strDepotId = item.depot_id.toString();

    // Use stable ID: param_master_id + depot_id combination for selection persistence
    const stableId =
      item.param_master_id && item.depot_id
        ? `${item.param_master_id}_${item.depot_id}`
        : generateUniqueNumberId();

    return <IParameterMode>{
      ...item,
      id: stableId,
      chk: false,
      svc_prov_id: Number.parseInt(this.svcProviderID!, 10),
      depot_name: strDepotId === '0' ? 'All Depot' : depot?.depot_name,
      param_master_id: item.param_master_id,
    };
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
    const allSelectedItems = this.selectionService.getParameterModeSelections();
    if (!allSelectedItems.length) {
      this.showSnackbarNotification(
        'Select at least one parameter before continuing.',
        'Set Parameter Action',
        'warning'
      );
      return;
    }
    const paramMasterIds = Array.from(
      new Set(
        allSelectedItems
          .map(item => item.param_master_id)
          .filter((id): id is number => typeof id === 'number')
      )
    );

    if (action === 'live') {
      this.validateSelectionsForLive(allSelectedItems, paramMasterIds);
      return;
    }

    if (action === 'trial') {
      this.validateSelectionsForTrial(allSelectedItems, paramMasterIds);
      return;
    }

    this.openViewDialog(action, allSelectedItems, paramMasterIds);
  }

  onPageChange(event: IPaginationEvent): void {
    this.currentPage = event.page;
    this.paginationService.handlePageEvent(
      this.params,
      event,
      this.reloadHandler.bind(this)
    );
  }

  private startStatusRefreshCycle(paramMasterIds: number[]): void {
    this.statusRefresh.start(
      paramMasterIds,
      this.trialSchedulerRateSeconds,
      () => this.isDestroyed
    );
  }

  private refreshActionHistoryForPendingIds(): void {
    if (
      !this.statusRefresh.pendingParamMasterIds.length ||
      this.isDestroyed
    ) {
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
        console.error(
          'Failed to refresh parameter mode action history:',
          error
        );
      },
    });
  }

  private stopStatusRefreshCycle(trigger?: boolean): void {
    this.statusRefresh.stop(trigger);
  }

  private triggerErrorCheck(paramMasterIds: number[]): void {
    const params: IActionHistoryParams = {
      ...this.errorCheckParams,
      param_master_ids: paramMasterIds,
    };

    this.parameterService
      .searchParameterModeErrors(params)
      .pipe(finalize(() => this.refreshActionRequiredAndHistory()))
      .subscribe({
        next: value => {
          if (value.status === 200 && value.payload) {
            const errorData = value.payload['parameter_mode_list'] || [];

            if (Array.isArray(errorData) && errorData.length > 0) {
              this.store.dispatch(
                showSnackbar({
                  message: `Found ${errorData.length} parameter mode error(s). Please check the system.`,
                  title: 'Parameter Mode Error',
                  typeSnackbar: 'error',
                })
              );
            }
          }
        },
        error: error => {
          console.error('Error checking for parameter mode errors:', error);
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
          console.error(
            'Error refreshing Parameter Mode Action Required data:',
            error
          );
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
          console.error(
            'Error refreshing Parameter Mode Action History data:',
            error
          );
        },
      });
  }

  isInProgressStatus(status?: string | null): boolean {
    if (!status) {
      return false;
    }
    return this.inProgressStatusCodes.has(status.toUpperCase());
  }

  private validateSelectionsForLive(
    selections: IParameterMode[],
    paramMasterIds: number[]
  ): void {
    const payload = this.buildValidationPayload(selections);

    if (!payload.length) {
      this.showSnackbarNotification(
        'Unable to validate Set Live request. Missing parameter identifiers.',
        'Set Live',
        'error'
      );
      return;
    }

    this.parameterService.validateLive(payload).subscribe({
      next: value => {
        if (value.status === 200) {
          const validatedStatuses: IValidatedParameterStatus[] =
            value.payload?.['validated_parameter_status'] ?? [];
          const mergedSelection = this.mergeValidatedStatuses(
            validatedStatuses,
            selections
          );
          const userActionType = this.extractUserActionType(validatedStatuses);

          this.openViewDialog('live', mergedSelection, paramMasterIds, {
            remark: value.message,
            userActionType,
          });
        } else {
          this.showSnackbarNotification(
            value.message ||
              'Validation failed. Please try again before setting live.',
            'Set Live',
            'error'
          );
        }
      },
      error: error => {
        console.error('Failed to validate Set Live request:', error);
        this.showSnackbarNotification(
          'Unable to validate Set Live request. Please retry.',
          'Set Live',
          'error'
        );
      },
    });
  }

  private validateSelectionsForTrial(
    selections: IParameterMode[],
    paramMasterIds: number[]
  ): void {
    const payload = this.buildValidationPayload(selections);

    if (!payload.length) {
      this.showSnackbarNotification(
        'Unable to validate Set Trial request. Missing parameter identifiers.',
        'Set Trial',
        'error'
      );
      return;
    }

    this.parameterService.validateTrial(payload).subscribe({
      next: value => {
        if (value.status === 200) {
          const validatedStatuses: IValidatedParameterStatus[] =
            value.payload?.['validated_parameter_status'] ?? [];
          const mergedSelection = this.mergeValidatedStatuses(
            validatedStatuses,
            selections
          );
          const userActionType = this.extractUserActionType(validatedStatuses);

          this.openViewDialog('trial', mergedSelection, paramMasterIds, {
            remark: value.message,
            userActionType,
          });
        } else {
          this.showSnackbarNotification(
            value.message ||
              'Validation failed. Please try again before setting trial.',
            'Set Trial',
            'error'
          );
        }
      },
      error: error => {
        console.error('Failed to validate Set Trial request:', error);
        this.showSnackbarNotification(
          'Unable to validate Set Trial request. Please retry.',
          'Set Trial',
          'error'
        );
      },
    });
  }

  private buildValidationPayload(
    selections: IParameterMode[]
  ): IValidateLiveRequest[] {
    return selections
      .filter(
        item =>
          typeof item.param_master_id === 'number' &&
          item.param_master_id !== undefined &&
          item.depot_id !== undefined &&
          !Number.isNaN(Number(item.depot_id))
      )
      .map(item => ({
        param_master_id: item.param_master_id as number,
        depot_id: Number(item.depot_id),
        parameter_name: item.parameter_name,
        parameter_version: item.parameter_version,
        effective_date_time: item.effective_date_time,
      }));
  }

  private mergeValidatedStatuses(
    validatedStatuses: IValidatedParameterStatus[],
    originalSelections: IParameterMode[]
  ): IParameterMode[] {
    if (!validatedStatuses?.length) {
      return originalSelections;
    }

    const selectionMap = new Map<number, IParameterMode>();
    originalSelections.forEach(item => {
      if (typeof item.param_master_id === 'number') {
        selectionMap.set(item.param_master_id, item);
      }
    });

    const handledIds = new Set<number>();

    const merged = validatedStatuses.map(validatedItem => {
      const paramMasterId = validatedItem.parameter_status?.param_master_id;
      const source =
        typeof paramMasterId === 'number'
          ? selectionMap.get(paramMasterId)
          : undefined;

      const validatedDepotId =
        validatedItem.parameter_status?.depot_id !== undefined
          ? Number(validatedItem.parameter_status?.depot_id)
          : undefined;

      const depot = this.depots.find(depotItem => {
        const depotIdNumber = Number(depotItem.depot_id);
        if (
          validatedDepotId !== undefined &&
          !Number.isNaN(validatedDepotId) &&
          !Number.isNaN(depotIdNumber)
        ) {
          return depotIdNumber === validatedDepotId;
        }
        return (
          String(depotItem.depot_id) ===
          String(validatedItem.parameter_status?.depot_id)
        );
      });

      const resolvedDepotId =
        validatedItem.parameter_status?.depot_id ??
        source?.depot_id ??
        depot?.depot_id ??
        '';
      const resolvedDepotName =
        depot?.depot_name ?? source?.depot_name ?? 'Unknown Depot';
      const resolvedParameterName =
        validatedItem.parameter_status?.parameter_name ??
        source?.parameter_name ??
        '';
      const resolvedParameterVersion =
        validatedItem.parameter_status?.parameter_version ??
        source?.parameter_version ??
        '';
      const resolvedEffectiveDate =
        validatedItem.parameter_status?.effective_date_time ??
        source?.effective_date_time;
      const resolvedParamMasterId =
        paramMasterId ?? source?.param_master_id ?? undefined;

      const baseItem: IParameterMode = {
        ...(source ?? {
          chk: false,
          id: generateUniqueNumberId(),
          version: 0,
        }),
        depot_id: resolvedDepotId,
        depot_name: resolvedDepotName,
        parameter_name: resolvedParameterName,
        parameter_version: resolvedParameterVersion,
        effective_date_time: resolvedEffectiveDate,
        param_master_id: resolvedParamMasterId,
        svc_prov_id: source?.svc_prov_id,
        scenario_details: validatedItem.scenario_details,
      };
      if (typeof paramMasterId === 'number') {
        handledIds.add(paramMasterId);
      }
      return baseItem;
    });

    const unvalidatedSelections = originalSelections.filter(item => {
      if (typeof item.param_master_id !== 'number') {
        return true;
      }
      return !handledIds.has(item.param_master_id);
    });

    return [...merged, ...unvalidatedSelections];
  }

  private extractUserActionType(
    validatedStatuses: IValidatedParameterStatus[]
  ): TUserActionType {
    const actionType = validatedStatuses?.find(
      status => status.scenario_details?.user_action_type
    )?.scenario_details?.user_action_type;
    return (actionType as TUserActionType) || 'NONE';
  }

  private getUpdateViewTitle(action: string): string {
    if (action === 'live') {
      return 'Live';
    }
    if (action === 'trial') {
      return 'Trial';
    }
    return '';
  }

  private openViewDialog(
    action: string,
    selection: IParameterMode[],
    paramMasterIds: number[],
    options?: {
      remark?: string;
      userActionType?: TUserActionType;
    }
  ): void {
    const dialogRef = this.dialog.open(ViewComponent, {
      width: '95%',
      height: '70%',
      disableClose: true,
      data: {
        title: `${this.getUpdateViewTitle(action)} Selected`,
        selection,
        action,
        remark: options?.remark,
        userActionType: options?.userActionType ?? 'NONE',
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (
        ['live', 'trial'].includes(action) &&
        !['cancel', 'no', 'ok'].includes(result)
      ) {
        // Switch to Action History tab after successful submission
        this.tabIdx = 1;
        this.selectionService.clearParameterModeSelections();
        this.reloadHandler();
        this.startStatusRefreshCycle(paramMasterIds);
      }
    });
  }

  private showSnackbarNotification(
    message: string,
    title: string,
    typeSnackbar: string = 'info'
  ): void {
    this.store.dispatch(
      showSnackbar({
        message,
        title,
        typeSnackbar,
      })
    );
  }
}
