import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

import { AgGridAngular } from 'ag-grid-angular';
import type {
  GridOptions,
} from 'ag-grid-community';
import {
  AllCommunityModule,
  ClientSideRowModelModule,
  ModuleRegistry,
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule, ClientSideRowModelModule]);

export interface TableColumn<T> {
  columnDef: string;
  header: string;
  subHeader: Array<any>;
  sortable?: boolean;
  cell: (element: T) => string | number;
}

@Component({
    selector: 'app-wrapper-table',
    templateUrl: './wrapper-table.component.html',
    styleUrl: './wrapper-table.component.scss',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatTableModule,
        MatIcon,
        MatFormFieldModule,
        MatInputModule,
        AgGridAngular,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WrapperTableComponent<T> implements OnInit, OnChanges {
  @Input() dataSource: T[] = [];
  @Input() columns: TableColumn<T>[] = [];
  @Input() hasSearch = false;

  columnDefs: string[] = [];

  searchControl = new FormControl('');

  gridOptions: GridOptions = {
    columnDefs: this.columns?.map(col => ({
      field: col.columnDef,
      headerName: col.header,
      headerClass: 'ag-center-header',
    })),
    defaultColDef: {
      width: 120,
      filter: false,
      sortable: true,
      resizable: true,
    },
    rowData: this.dataSource,
    icons: {
      sortAscending: '<span class="custom-sort"></span>', // Custom icon for ascending sort
      sortDescending: '<span class="custom-sort"></span>', // Custom icon for descending sort
      sortUnSort: '<span class="custom-sort"></span>', // Custom icon for unsorted state
    },
  };

  // exampleData = [
  //   {
  //     device_id: { value: 'SG0069', status: 'inconsistent' },
  //     time: { value: '2024-12-25T23:15:30' },
  //     device_1: { id: { value: '0' }, ver: { value: '-' } },
  //     device_2: { id: { value: '0' }, ver: { value: '-' } },
  //     device_3: { id: { value: '0' }, ver: { value: '-' } },
  //     device_4: { id: { value: '0' }, ver: { value: '-' } },
  //     device_5: { id: { value: '0' }, ver: { value: '-' } },
  //     device_6: { id: { value: '0' }, ver: { value: '-' } },
  //   },
  //   {
  //     device_id: { value: 'SBS9559' },
  //     time: { value: '2024-09-25T23:15:30' },
  //     device_1: { id: { value: '760093123' }, ver: { value: '55,56' } },
  //     device_2: { id: { value: '591184123' }, ver: { value: '55,56' } },
  //     device_3: { id: { value: '591184123' }, ver: { value: '55,56' } },
  //     device_4: { id: { value: '591184123' }, ver: { value: '30,31' } },
  //     device_5: { id: { value: '0' }, ver: { value: '-' } },
  //     device_6: { id: { value: '0' }, ver: { value: '-' } },
  //   },
  //   {
  //     device_id: { value: 'SBS0009' },
  //     time: { value: '2024-11-10T23:15:30' },
  //     device_1: { id: { value: '591184123' }, ver: { value: '56,57' } },
  //     device_2: { id: { value: '0' }, ver: { value: '-' } },
  //     device_3: { id: { value: '0' }, ver: { value: '-' } },
  //     device_4: { id: { value: '0' }, ver: { value: '-' } },
  //     device_5: { id: { value: '0' }, ver: { value: '-' } },
  //     device_6: { id: { value: '0' }, ver: { value: '-' } },
  //   },
  //   {
  //     device_id: { value: 'SBS0022' },
  //     time: { value: '2024-12-12T23:15:30' },
  //     device_1: { id: { value: '0' }, ver: { value: '56,57' } },
  //     device_2: { id: { value: '4' }, ver: { value: '56,57' } },
  //     device_3: { id: { value: '1' }, ver: { value: '54,55,56,57' } },
  //     device_4: { id: { value: '76009379' }, ver: { value: '57' } },
  //     device_5: { id: { value: '0' }, ver: { value: '56,57' } },
  //     device_6: { id: { value: '76009379' }, ver: { value: '55,56,57' } },
  //   },
  //   {
  //     device_id: { value: 'SBS0023', status: 'inconsistent' },
  //     time: { value: '2024-12-25T23:15:30' },
  //     device_1: {
  //       id: { value: '591184123' },
  //       ver: { value: '55,56,57', status: 'inconsistent' },
  //     },
  //     device_2: { id: { value: '0' }, ver: { value: '-' } },
  //     device_3: {
  //       id: { value: '591184123' },
  //       ver: { value: '55,56,57', status: 'inconsistent' },
  //     },
  //     device_4: {
  //       id: { value: '591184123' },
  //       ver: { value: '55,56,57', status: 'inconsistent' },
  //     },
  //     device_5: { id: { value: '0' }, ver: { value: '-' } },
  //     device_6: { id: { value: '0' }, ver: { value: '-' } },
  //   },
  //   {
  //     device_id: { value: 'QTA2118', status: 'failed' },
  //     time: { value: '2024-12-25T23:15:30' },
  //     device_1: { id: '2380118', ver: { value: '56,57', status: 'failed' } },
  //     device_2: { id: { value: '0' }, ver: { value: '-', status: 'failed' } },
  //     device_3: { id: { value: '0' }, ver: { value: '-', status: 'failed' } },
  //     device_4: { id: { value: '0' }, ver: { value: '-', status: 'failed' } },
  //     device_5: { id: { value: '0' }, ver: { value: '-', status: 'failed' } },
  //     device_6: { id: { value: '0' }, ver: { value: '-', status: 'failed' } },
  //   },
  //   {
  //     device_id: { value: 'PA1597' },
  //     time: { value: '2024-12-25T23:15:30' },
  //     device_1: { id: { value: '0' }, ver: { value: '-' } },
  //     device_2: { id: { value: '0' }, ver: { value: '-' } },
  //     device_3: { id: { value: '0' }, ver: { value: '-' } },
  //     device_4: { id: { value: '0' }, ver: { value: '-' } },
  //     device_5: { id: { value: '0' }, ver: { value: '-' } },
  //     device_6: { id: { value: '0' }, ver: { value: '-' } },
  //   },
  // ];

  // // Column Definitions: Defines the columns to be displayed.
  // colDefs: (ColDef | ColGroupDef)[] = [
  //   {
  //     field: 'no',
  //     headerName: 'No.',
  //     headerClass: 'ag-center-header',
  //     valueGetter: params => (params.node?.rowIndex ?? 0) + 1,
  //     width: 70,
  //     cellStyle: { 'text-align': 'center' },
  //     suppressMovable: true,
  //     children: [
  //       {
  //         field: 'id',
  //         headerName: '',
  //         valueGetter: params => (params.node?.rowIndex ?? 0) + 1,
  //       },
  //     ],
  //   },
  //   {
  //     field: 'device_id',
  //     headerName: 'Device ID',
  //     headerClass: 'ag-center-header',
  //     width: 120,
  //     sortable: true,
  //     valueGetter: (params: ValueGetterParams) => params.data.device_id.value,
  //     cellClass: params => params.data.device_id.status || '',
  //     children: [
  //       {
  //         field: 'id',
  //         headerName: '',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_id.value,
  //         cellClass: params => params.data.device_id.status || '',
  //       },
  //     ],
  //   },
  //   {
  //     field: 'time',
  //     headerName: 'Time Of\nReporting',
  //     headerClass: 'ag-center-header',
  //     sortable: true,
  //     minWidth: 200,
  //     headerComponentParams: { menuIcon: 'fa-external-link-alt' },
  //     valueFormatter: (params: ValueFormatterParams) => {
  //       const date = new Date(params.data.time.value);
  //       const dateStr = date.toLocaleDateString('en-SG');
  //       const timeStr = date.toLocaleTimeString('en-SG', {
  //         hour: '2-digit',
  //         minute: '2-digit',
  //         second: '2-digit',
  //         hour12: false,
  //       });
  //       return `${dateStr}\n${timeStr}`;
  //     },
  //     cellStyle: {
  //       'white-space': 'wrap',
  //       'line-height': '1.3',
  //       padding: '4px',
  //     },
  //     children: [
  //       {
  //         field: 'id',
  //         headerName: '',
  //         valueFormatter: (params: ValueFormatterParams) => {
  //           const date = new Date(params.data.time.value);
  //           const dateStr = date.toLocaleDateString('en-SG');
  //           const timeStr = date.toLocaleTimeString('en-SG', {
  //             hour: '2-digit',
  //             minute: '2-digit',
  //             second: '2-digit',
  //             hour12: false,
  //           });
  //           return `${dateStr}\n${timeStr}`;
  //         },
  //       },
  //     ],
  //   },
  //   {
  //     field: 'device_1',
  //     headerName: 'Device 1',
  //     headerClass: 'ag-center-header',
  //     children: [
  //       {
  //         field: 'id',
  //         headerName: 'ID',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_1.id.value,
  //         cellClass: params => params.data.device_1.id?.status || '',
  //       },
  //       {
  //         field: 'ver',
  //         headerName: 'Ver',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_1.ver?.value,
  //         cellClass: params => params.data.device_1.ver?.status || '',
  //       },
  //     ],
  //   },
  //   {
  //     field: 'device_2',
  //     headerName: 'Device 2',
  //     headerClass: 'ag-center-header',
  //     children: [
  //       {
  //         field: 'id',
  //         headerName: 'ID',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_2.id?.value,
  //         cellClass: params => params.data.device_2?.id?.status || '',
  //       },
  //       {
  //         field: 'ver',
  //         headerName: 'Ver',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_2.ver?.value,
  //         cellClass: params => params.data.device_2?.ver?.status || '',
  //       },
  //     ],
  //   },
  //   {
  //     field: 'device_3',
  //     headerName: 'Device 3',
  //     headerClass: 'ag-center-header',
  //     children: [
  //       {
  //         field: 'id',
  //         headerName: 'ID',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_3.id?.value,
  //         cellClass: params => params.data.device_3?.id?.status || '',
  //       },
  //       {
  //         field: 'ver',
  //         headerName: 'Ver',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_3.ver?.value,
  //         cellClass: params => params.data.device_3.ver?.status || '',
  //       },
  //     ],
  //   },
  //   {
  //     field: 'device_4',
  //     headerName: 'Device 4',
  //     headerClass: 'ag-center-header',
  //     children: [
  //       {
  //         field: 'id',
  //         headerName: 'ID',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_4.id?.value,
  //         cellClass: params => params.data.device_4?.id?.status || '',
  //       },
  //       {
  //         field: 'ver',
  //         headerName: 'Ver',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_4.ver?.value,
  //         cellClass: params => params.data.device_4?.ver?.status || '',
  //       },
  //     ],
  //   },
  //   {
  //     field: 'device_5',
  //     headerName: 'Device 5',
  //     headerClass: 'ag-center-header',
  //     children: [
  //       {
  //         field: 'id',
  //         headerName: 'ID',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_5.id?.value,
  //         cellClass: params => params.data.device_5?.id?.status || '',
  //       },
  //       {
  //         field: 'ver',
  //         headerName: 'Ver',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_5.ver?.value,
  //         cellClass: params => params.data.device_5?.ver?.status || '',
  //       },
  //     ],
  //   },
  //   {
  //     field: 'device_6',
  //     headerName: 'Device 6',
  //     headerClass: 'ag-center-header',
  //     children: [
  //       {
  //         field: 'id',
  //         headerName: 'ID',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_6.id?.value,
  //         cellClass: params => params.data.device_6?.id?.status || '',
  //       },
  //       {
  //         field: 'ver',
  //         headerName: 'Ver',
  //         valueGetter: (params: ValueGetterParams) =>
  //           params.data.device_6.ver?.value,
  //         cellClass: params => params.data.device_6?.ver?.status || '',
  //       },
  //     ],
  //   },
  // ];

  // gridOptions: GridOptions = {
  //   columnDefs: this.colDefs,
  //   defaultColDef: {
  //     flex: 1,
  //     filter: false,
  //     sortable: false,
  //     resizable: true,
  //   },
  //   rowData: this.exampleData,
  // };

  sampleDataForSubHeader = [
    {
      id: 1,
      svCategory: 7,
      aib: {
        no1: 15.22,
        no2: 68.91,
        no3: 54.33,
        no4: 77.1,
        no5: 9.44,
        no6: 33.87,
        no7: 12.55,
        no8: 91.22,
      },
      cib: {
        no1: 11.3,
        no2: 55.29,
        no3: 2.14,
      },
      sib: {
        no1: 43.29,
        no2: 1.88,
        no3: 66.77,
      },
    },
    {
      id: 2,
      svCategory: 3,
      aib: {
        no1: 19.1,
        no2: 51.87,
        no3: 33.22,
        no4: 82.9,
        no5: 75.33,
        no6: 60.5,
        no7: 28.88,
        no8: 10.91,
      },
      cib: {
        no1: 3.22,
        no2: 22.18,
        no3: 17.5,
      },
      sib: {
        no1: 8.32,
        no2: 10.11,
        no3: 71.44,
      },
    },
    {
      id: 3,
      svCategory: 12,
      aib: {
        no1: 30.11,
        no2: 90.1,
        no3: 55.66,
        no4: 31.11,
        no5: 1.2,
        no6: 9.45,
        no7: 77.24,
        no8: 33.9,
      },
      cib: {
        no1: 9.55,
        no2: 8.2,
        no3: 5.99,
      },
      sib: {
        no1: 55.77,
        no2: 29.32,
        no3: 1.1,
      },
    },
    {
      id: 4,
      svCategory: 18,
      aib: {
        no1: 88.19,
        no2: 4.91,
        no3: 10.5,
        no4: 95.11,
        no5: 66.81,
        no6: 72.34,
        no7: 12,
        no8: 45.55,
      },
      cib: {
        no1: 33.9,
        no2: 44.25,
        no3: 90.1,
      },
      sib: {
        no1: 6.44,
        no2: 12.78,
        no3: 88.33,
      },
    },
    {
      id: 5,
      svCategory: 2,
      aib: {
        no1: 22.1,
        no2: 65.33,
        no3: 90.2,
        no4: 55.6,
        no5: 10.9,
        no6: 96.11,
        no7: 4.18,
        no8: 30.77,
      },
      cib: {
        no1: 10.4,
        no2: 59.2,
        no3: 33.33,
      },
      sib: {
        no1: 12.11,
        no2: 3.88,
        no3: 70.99,
      },
    },
    {
      id: 6,
      svCategory: 0,
      aib: {
        no1: 13,
        no2: 44.1,
        no3: 29.33,
        no4: 20.88,
        no5: 42.42,
        no6: 1.22,
        no7: 19.22,
        no8: 8.56,
      },
      cib: {
        no1: 88.1,
        no2: 14.9,
        no3: 2.22,
      },
      sib: {
        no1: 11.1,
        no2: 98.44,
        no3: 56.77,
      },
    },
    {
      id: 7,
      svCategory: 20,
      aib: {
        no1: 78.9,
        no2: 55.11,
        no3: 32.77,
        no4: 5.5,
        no5: 19.9,
        no6: 78.33,
        no7: 9.9,
        no8: 66.54,
      },
      cib: {
        no1: 77.22,
        no2: 9.99,
        no3: 23.31,
      },
      sib: {
        no1: 91.44,
        no2: 32.11,
        no3: 2.88,
      },
    },
    {
      id: 8,
      svCategory: 11,
      aib: {
        no1: 66.12,
        no2: 3.88,
        no3: 2.11,
        no4: 99.1,
        no5: 1.55,
        no6: 20.1,
        no7: 77.77,
        no8: 50.55,
      },
      cib: {
        no1: 40.22,
        no2: 54.33,
        no3: 60.1,
      },
      sib: {
        no1: 8.2,
        no2: 19.09,
        no3: 10.88,
      },
    },
    {
      id: 9,
      svCategory: 15,
      aib: {
        no1: 9.33,
        no2: 21.1,
        no3: 44,
        no4: 9.3,
        no5: 18.88,
        no6: 90.99,
        no7: 33.11,
        no8: 7.77,
      },
      cib: {
        no1: 29.8,
        no2: 55.1,
        no3: 66.99,
      },
      sib: {
        no1: 11.77,
        no2: 22.66,
        no3: 90.22,
      },
    },
    {
      id: 10,
      svCategory: 9,
      aib: {
        no1: 55.9,
        no2: 20.3,
        no3: 60.22,
        no4: 7.1,
        no5: 43.22,
        no6: 17.1,
        no7: 5.55,
        no8: 99,
      },
      cib: {
        no1: 19.22,
        no2: 1.2,
        no3: 50.4,
      },
      sib: {
        no1: 33.21,
        no2: 9.78,
        no3: 41.1,
      },
    },
  ];

  sampleColumnsForSubHeader: any[] = [
    {
      columnDef: 'id',
      header: 'No.',
      sortable: false,
      subHeader: [],
    },
    {
      columnDef: 'svCategory',
      header: 'Service Category',
      sortable: false,
      subHeader: [],
    },
    {
      columnDef: 'aib',
      header: 'Adult IDFC Btn',
      sortable: false,
      subHeader: [
        {
          id: 'no1',
          name: 'No.1',
        },
        {
          id: 'no2',
          name: 'No.2',
        },
        {
          id: 'no3',
          name: 'No.3',
        },
        {
          id: 'no4',
          name: 'No.4',
        },
        {
          id: 'no5',
          name: 'No.5',
        },
        {
          id: 'no6',
          name: 'No.6',
        },
        {
          id: 'no7',
          name: 'No.7',
        },
        {
          id: 'no8',
          name: 'No.8',
        },
      ],
    },
    {
      columnDef: 'cib',
      header: 'Child IDFC Btn',
      sortable: false,
      subHeader: [
        {
          id: 'no1',
          name: 'No.1',
        },
        {
          id: 'no2',
          name: 'No.2',
        },
        {
          id: 'no3',
          name: 'No.3',
        },
      ],
    },
    {
      columnDef: 'sib',
      header: 'Senior IDFC Btn',
      sortable: false,
      subHeader: [
        {
          id: 'no1',
          name: 'No.1',
        },
        {
          id: 'no2',
          name: 'No.2',
        },
        {
          id: 'no3',
          name: 'No.3',
        },
      ],
    },
  ];
  ngOnInit(): void {
    // console.log({
    //   columnDefs: this.columns?.map(col => ({
    //     field: col.columnDef,
    //     headerName: col.header,
    //     headerClass: 'ag-center-header',
    //     valueGetter: (params: ValueGetterParams) =>
    //       params.data[col.columnDef as keyof T],
    //   })),
    // });
    // console.log('Data Source:', this.dataSource);
    // console.log('Columns:', this.gridOptions);
    this.columnDefs = this.columns?.map(column => column.columnDef as string);

    // console.log('columns:', this.columns);
    // console.log('Column Definitions:', this.columnDefs);
    // console.log('Data Source:', this.dataSource);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataSource']) {
      this.gridOptions.rowData = changes['dataSource']?.currentValue as T[];
    }
    if (changes['columns']) {
      this.gridOptions.columnDefs = changes['columns']?.currentValue?.map(
        (col: TableColumn<T>) => ({
          field: col.columnDef,
          headerName: col.header,
        })
      );
    }
  }

  get hasSubHeader(): boolean {
    return this.columns?.some(header => header.subHeader?.length);
  }

  get mainHeaderIds(): string[] {
    return this.columns.map(header => header.columnDef);
  }

  get subHeaderIds(): string[] {
    return this.columns.flatMap(header =>
      header.subHeader?.length
        ? header.subHeader.map(
            _subHeader => `${header.columnDef}_${_subHeader.id}`
          )
        : [`${header.columnDef}_placeholder`]
    );
  }
}
