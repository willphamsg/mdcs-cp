import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { DownloadDialogComponent } from '@app/components/download-dialog/download-dialog.component';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { DropdownList, IParams, PayloadResponse } from '@app/models/common';
import { IReportList } from '@app/models/daily-report';
import { IDepoList } from '@app/models/depo';
import { DailyReportService } from '@app/services/daily-report.service';
import { DepoService } from '@app/services/depo.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { DD_MM_YYYY_FORMAT } from '@app/shared/utils/date-time';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-all-daily-report',
    imports: [
        MatCardModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatExpansionModule,
        MatCheckboxModule,
        MatInputModule,
        MatDividerModule,
        MatTableModule,
        MatDatepickerModule,
        MatNativeDateModule,
        ReactiveFormsModule,
        FormsModule,
        CommonModule,
        RouterModule,
        FilterComponent,
        PaginationComponent,
        SelectedFilterComponent,
    ],
    providers: [
      provideNativeDateAdapter(),
      { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
      { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    ],
    templateUrl: './all-daily-report.component.html',
    styleUrl: './all-daily-report.component.scss'
})
export class AllDailyReportComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();
  dataSource: IReportList[] = [
    {
      chk: false,
      id: 1,
      depot_name: 'Mandal',
      report_type: 'Bus Arrival Exception Report',
    } as unknown as IReportList,
    {
      chk: false,
      id: 2,
      depot_name: 'Kranji',
      report_type: 'Bus List Audit Trial',
    } as unknown as IReportList,
    {
      chk: false,
      id: 3,
      depot_name: 'Blim',
      report_type: 'Bus Data Transfer Details',
    } as unknown as IReportList,
    {
      chk: false,
      id: 4,
      depot_name: 'Loyang',
      report_type: 'Bus Partial Upload Report',
    } as unknown as IReportList,
    {
      chk: false,
      id: 5,
      depot_name: 'Blim',
      report_type: 'Daily Bus List Report',
    } as unknown as IReportList,
    {
      chk: false,
      id: 6,
      depot_name: 'Loyang',
      report_type: 'DAGW Monthly Availability Report',
    } as unknown as IReportList,
    {
      chk: false,
      id: 7,
      depot_name: 'Blim',
      report_type: 'Daily Bus List Report',
    } as unknown as IReportList,
    {
      chk: false,
      id: 8,
      depot_name: 'Loyang',
      report_type: 'DAGW Monthly Availability Report',
    } as unknown as IReportList,
  ];
  chkAll: boolean = false;
  selection: IReportList[] = [];
  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {},
  };
  expandedMenu: boolean = false;

  displayedColumns: string[] = ['id', 'depot', 'reportType', 'view', 'chk'];
  depots: IDepoList[] = [];
  filterConfigs: IFilterConfig[] = [];

  reportTypes: DropdownList[] = [
    {
      id: '1',
      value: 'Bus Arrival Exception List',
    },
    {
      id: '2',
      value: 'Bus Partial Upload',
    },
    {
      id: '3',
      value: 'Daily Bus List',
    },
    {
      id: '4',
      value: 'Bus List Audit Trail',
    },
    {
      id: '5',
      value: 'Bus Data Transfer',
    },
  ];

  constructor(
    private readonly dailyReportService: DailyReportService,
    private readonly depoService: DepoService,
    public readonly dialog: MatDialog
  ) {}
  ngOnInit() {
    this.subscribeToDepoChanges();
    this.loadFilterValues();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  subscribeToDepoChanges(): void {
    const depotList$ = this.depoService.depoList$;

    depotList$.pipe(takeUntil(this.destroy$)).subscribe(depotList => {
      this.depots = depotList;
      this.reloadHandler();
    });
  }

  loadFilterValues(): void {
    this.filterConfigs = [
      {
        controlName: 'reportType',
        value: [],
        type: 'array',
        options: this.reportTypes,
      },
      {
        controlName: 'depots',
        value: [],
        type: 'array',
        options: this.depots,
      },
      {
        controlName: 'businessDate',
        type: 'date-picker',
        value: '',
      },
    ];
  }

  reloadHandler(): void {
    this.fetchDailyReportList();
  }

  fetchDailyReportList(): void {
    this.dailyReportService
      .search(this.params as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (value: PayloadResponse) => {
          if (value.status == 200) {
            this.dataSource = value.payload['daily-report'];
            this.selection = [];
            this.chkAll = false;
          }
        },
      });
  }

  checkboxToggle(element: IReportList): void {
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

  checkHandler(event: MatCheckboxChange, element: IReportList) {
    if (event.checked) {
      this.selection.push(element);
    } else {
      this.selection = this.selection.filter(x => x.id != element.id);
    }
  }

  checkAllHandler(event: MatCheckboxChange): void {
    this.chkAll = event.checked;
    this.dataSource.forEach(x => (x.chk = event.checked));

    this.selection = event.checked ? [...this.dataSource] : [];
  }

  sortHandler(element: Sort) {
    this.params.sort_order = [
      { name: element.active, desc: element.direction != 'asc' },
    ];
  }

  menuHandler(isOpen: boolean) {
    this.expandedMenu = isOpen;
  }

  downloadHandler() {
    this.dialog.open(DownloadDialogComponent, {
      width: '100%',
      height: '100%',
      maxHeight: '266px',
      maxWidth: '420px',
      panelClass: ['download-dialog'],
      autoFocus: 'first-heading',
      disableClose: true,
      data: {
        progress: '100',
        totol: '100',
      },
    });
  }
}
