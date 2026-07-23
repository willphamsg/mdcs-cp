import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { BreadcrumbsComponent } from '@app/components/layout/breadcrumbs/breadcrumbs.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import {
  DropdownList,
  IHeader,
  IPaginationEvent,
  IParams,
} from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { ITrialDeviceSelection } from '@app/models/parameter-trial';
import { DepoService } from '@app/services/depo.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import TrialDeviceSelection from '@data/trial-device-selection-header.json';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { ViewComponent } from '../view/view.component';
import { TrialDeviceSelectionService } from '@app/services/trial-device-selection.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { CommonService } from '@app/services/common.service';
import { AuthService } from '@app/services/auth.service';
import { ParameterSelectionService } from '@app/services/parameter-selection.service';
import { generateUniqueNumberId } from '@app/shared/utils/utils';

@Component({
  selector: 'app-trial-device-selection-search',
  templateUrl: './trial-device-selection-search.component.html',
  styleUrls: ['./trial-device-selection-search.component.scss'],
  imports: [
    BreadcrumbsComponent,
    MatSortModule,
    MatCardModule,
    MatDividerModule,
    MatTabsModule,
    MatTableModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FilterComponent,
    PaginationComponent,
    SelectedFilterComponent,
  ],
})
export class TrialDeviceSelectionSearchComponent implements OnInit, OnDestroy {
  dagw = this.authService.isDagw();
  private readonly destroy$ = new Subject<void>();
  headerData = TrialDeviceSelection;
  chkAll = false;
  tab1Columns: string[] = this.headerData.map((x: IHeader) => x.field);
  tab2Columns = [...this.tab1Columns, 'chk'];
  options: DropdownList[] = [];
  rowCount: number = 0;
  currentPage: number = 1;
  dataSource: ITrialDeviceSelection[] = [];
  selection: ITrialDeviceSelection[] = [];

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      day_type: '',
      bus_num: '',
      svc_prov_id: '',
      depot_id: '',
    },
  };
  depots: IDepoList[] = [];

  filterConfigs: IFilterConfig[] = [];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  constructor(
    private readonly trialDeviceSelectionService: TrialDeviceSelectionService,
    private readonly filterService: FilterService,
    private readonly paginationService: PaginationService,
    private readonly depoService: DepoService,
    private readonly commonService: CommonService,
    public readonly dialog: MatDialog,
    public readonly authService: AuthService,
    private readonly selectionService: ParameterSelectionService
  ) {}

  ngOnInit() {
    this.tab1Columns.push('chk');

    this.subscribeToDepoChanges();

    // Subscribe to selection changes
    this.selectionService.trialDeviceSelection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(selections => {
        this.selection = selections;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clear selections when component is destroyed
    this.selectionService.clearTrialDeviceSelections();
  }

  subscribeToDepoChanges(): void {
    const depotList$ = this.depoService.depoList$;
    const searchValue$ = this.filterService.searchValue$;
    const filterValues$ = this.filterService.filterValues$;

    combineLatest([depotList$, searchValue$, filterValues$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([depotList, searchValue, filterValue]) => {
        this.params.search_text = searchValue;

        const wasEmpty = this.depots.length === 0;
        this.depots = depotList;
        if (wasEmpty && this.depots.length > 0) {
          this.loadFilterValues();
        }

        let depots = filterValue?.['depots'] ?? [];
        if (!Array.isArray(depots) || depots.length === 0) {
          depots = this.commonService.getDepotIds(depotList);
        }

        const trialGroup = Array.isArray(filterValue?.['trialGroup'])
          ? filterValue['trialGroup'][0]
          : filterValue?.['trialGroup'];
        const busServiceGroup = Array.isArray(filterValue?.['busServiceGroup'])
          ? filterValue['busServiceGroup'][0]
          : filterValue?.['busServiceGroup'];
        const fareParameterGroup = Array.isArray(
          filterValue?.['fareParameterGroup']
        )
          ? filterValue['fareParameterGroup'][0]
          : filterValue?.['fareParameterGroup'];

        this.params.search_select_filter = {
          day_type: '',
          bus_num: '',
          svc_prov_id: '',
          depot_id: depots,
        };

        if (
          trialGroup &&
          trialGroup !== '' &&
          trialGroup !== null &&
          trialGroup !== undefined
        ) {
          this.params.search_select_filter['trial_group'] = trialGroup;
        }
        if (
          busServiceGroup &&
          busServiceGroup !== '' &&
          busServiceGroup !== null &&
          busServiceGroup !== undefined
        ) {
          this.params.search_select_filter['service_group'] = busServiceGroup;
        }
        if (
          fareParameterGroup &&
          fareParameterGroup !== '' &&
          fareParameterGroup !== null &&
          fareParameterGroup !== undefined
        ) {
          this.params.search_select_filter['parameter_group'] =
            fareParameterGroup;
        }

        this.paginationService.currentPage = 1;
        this.params.page_index = 0;
        this.currentPage = 1;

        this.selectionService.clearTrialDeviceSelections();

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
        controlName: 'trialGroup',
        value: [],
        type: 'radio',
        options: [
          // { label: 'Trial', value: 'trial' },
          // { label: 'Non Trial', value: 'non-trial' },
          { id: 'trial', value: 'Trial' },
          { id: 'non-trial', value: 'Non Trial' },
        ],
      },
      {
        controlName: 'busServiceGroup',
        value: [],
        type: 'radio',
        options: [
          { id: 'trial', value: 'Trial' },
          { id: 'non-trial', value: 'Non Trial' },
        ],
      },
      {
        controlName: 'fareParameterGroup',
        value: [],
        type: 'radio',
        options: [
          { id: 'trial', value: 'Trial' },
          { id: 'non-trial', value: 'Non Trial' },
        ],
      },
    ];

    // Update the filter service with new configs to enable proper filter persistence
    this.filterService.updateFilterConfigs(this.filterConfigs);
  }

  reloadHandler(): void {
    if (this.depots) {
      this.trialDeviceSelectionService.search(this.params).subscribe({
        next: value => {
          if (value.status === 201) {
            this.updateDataSource(value.payload);
          }
        },
      });
    }
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'];
    this.dataSource = payload['trial_device_summary_list'].map(
      (item: any, index: number) => this.mapDataList(item, index)
    );

    // Restore checkbox state for items that were previously selected
    this.dataSource.forEach(item => {
      item.chk = this.selectionService.isTrialDeviceSelected(item.id);
    });

    // Update check all state for current page
    this.updateCheckAllState();
  }

  mapDataList(item: any, index: number): any {
    const depot = this.depots.find(
      _d => _d.depot_id === item.depot_id
    )?.depot_name;

    // Create a unique identifier using depot_id, bus_num, and index
    const uniqueId = generateUniqueNumberId();

    return <any>{
      ...item,
      id: uniqueId,
      chk: false,
      depot,
    };
  }

  checkboxToggle(element: any): void {
    element.chk = !element.chk;
    const matCheckboxChange: MatCheckboxChange = {
      source: {
        checked: element.chk,
      } as any,
      checked: element.chk,
    };

    this.checkHandler(matCheckboxChange, element);
  }

  onCheckAllToggle(): void {
    this.chkAll = !this.chkAll;

    this.checkAllHandler({
      source: {
        checked: this.chkAll,
      } as any,
      checked: this.chkAll,
    });
  }

  checkHandler(event: MatCheckboxChange, element: any) {
    // Update element checkbox state
    element.chk = event.checked;

    // Toggle selection in the service
    if (event.checked) {
      this.selectionService.addTrialDeviceSelection(element);
    } else {
      this.selectionService.removeTrialDeviceSelection(element.id);
    }

    // Update the "check all" state based on current page selections
    this.updateCheckAllState();
  }

  private updateCheckAllState(): void {
    const totalSelectableItems = this.dataSource.length;
    // Count how many items on the current page are selected
    const selectedItemsOnCurrentPage = this.dataSource.filter(item =>
      this.selectionService.isTrialDeviceSelected(item.id)
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
      this.selectionService.addMultipleTrialDeviceSelections(itemsToAdd);
    } else {
      // Remove only current page items
      const idsToRemove = this.dataSource.map(item => {
        item.chk = false;
        return String(item.id);
      });
      this.selectionService.removeMultipleTrialDeviceSelections(idsToRemove);
    }
  }

  selectAllItems(): void {
    // const originalPageSize = this.params.page_size;
    // this.params.page_size = 9999;
    // if (this.params.depot_id) {
    //   this.newParameterApprovalService
    //     .search(this.params)
    //     .pipe(takeUntil(this.destroy$))
    //     .subscribe({
    //       next: (response: PayloadResponse) => {
    //         if (response.status === 200) {
    //           this.selection = response.payload['trial_device_summary_list'];
    //           this.params.page_size = originalPageSize;
    //         }
    //       },
    //     });
    // }
  }

  sortHandler(sort: Sort): void {
    this.params.sort_order = [
      { name: sort.active, desc: sort.direction !== 'asc' },
    ];
    this.reloadHandler();
  }

  headerHandler(event: MatCheckboxChange, element: IHeader) {
    this.headerData.find(x => x.field == element.field)!.chk =
      event.checked;
  }

  isLastRow(row: any): boolean {
    return this.dataSource.at(-1) === row;
  }

  hiddenHandler(element: string) {
    return this.headerData.find(x => x.field == element)!.chk;
  }

  updateView() {
    // Get all selected items from the service
    const allSelectedItems = this.selectionService.getTrialDeviceSelections();

    const dialogRef = this.dialog.open(ViewComponent, {
      width: '95%',
      height: '70%',
      disableClose: true,
      data: {
        title: 'Edit selected record(s)',
        selection: allSelectedItems, // Pass all selected items from the service
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result !== 'cancel') {
          // Clear selections after successful action
          this.selectionService.clearTrialDeviceSelections();
          this.reloadHandler();
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
