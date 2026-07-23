import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { RouterModule } from '@angular/router';
import { IBustExpList } from '@models/bus-exception-list';
import {
  IHeader,
  IPaginationEvent,
  IParams,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { ManageBusExceptionListService } from '@services/bus-exception-list.service';

import { MatDividerModule } from '@angular/material/divider';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { FilterService } from '@app/services/filter.service';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import BusExpListHeader from '@data/bus-exception-list-header.json';
import { DepoService } from '@services/depo.service';
import { combineLatest, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PaginationService } from '@app/services/pagination.service';
import { CommonService } from '@app/services/common.service';

@Component({
  selector: 'app-bus-exception-list-search',
  templateUrl: './bus-exception-list-search.component.html',
  styleUrls: ['./bus-exception-list-search.component.scss'],
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
})
export class BusExceptionListSearchComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();
  headerData = BusExpListHeader;
  displayedColumns: string[] = BusExpListHeader.map((x: IHeader) => {
    return x.field;
  });
  depots: IDepoList[] = [];

  dataSource: IBustExpList[] = [];

  rowCount: number = 0;
  currentPage: number = 1;

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id: [],
    },
  };

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  filterConfigs: any = {};

  constructor(
    private readonly manageBusExceptionListService: ManageBusExceptionListService,
    private readonly depoService: DepoService,
    public readonly dialog: MatDialog,
    private readonly filterService: FilterService,
    public readonly paginationService: PaginationService,
    private readonly commonService: CommonService
  ) {}

  ngOnInit() {
    this.subscribeToDepoChanges();
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

        let depots = filterValue?.['depots'] ?? [];
        if (!Array.isArray(depots) || depots.length === 0) {
          depots = this.commonService.getDepotIds(depotList);
        }

        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          depot_id: depots,
        };

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
    ];
  }

  reloadHandler() {
    if (this.depots) {
      this.manageBusExceptionListService.search(this.params).subscribe({
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
    this.dataSource = payload['operational_bus_list'].map(
      this.mapBusList.bind(this)
    );
  }

  mapBusList(item: IBustExpList): IBustExpList {
    const depot = this.depots.find(_d => _d.depot_id === item.depot_id);
    return <IBustExpList>{
      ...item,
      depot,
    };
  }

  sortHandler(element: Sort) {
    this.params.sort_order = [
      { name: element.active, desc: element.direction != 'asc' },
    ];
    this.reloadHandler();
  }

  headerHandler(event: MatCheckboxChange, element: IHeader) {
    this.headerData.find(x => x.field == element.field)!.chk =
      event.checked;
  }

  hiddenHandler(element: string) {
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
}
