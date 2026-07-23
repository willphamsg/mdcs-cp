import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { DropdownList } from '@app/models/common';
import { IParameterPayloadDetails } from '@app/models/parameter-management';
import { PaginationService } from '@app/services/pagination.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-system-parameters',
  standalone: true,
  imports: [
    // MatCard,
    // ClickStopPropagationDirective,
    // BreadcrumbsComponent,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    MatInputModule,
    MatSortModule,
    MatExpansionModule,
    // NgIf,
    CommonModule,
    MatMenuModule,
    // NgFor,
    FormsModule,
    PaginationComponent,
    FilterComponent,
    SelectedFilterComponent,
  ],
  templateUrl: './system-parameters.component.html',
  styleUrl: './system-parameters.component.scss',
})
export class SystemParametersComponent implements OnInit {
  @Input() dataSource: Array<any> = [];
  @Input() type: string = '';
  paginatedData$: Observable<IParameterPayloadDetails[]> = of([]);

  busCashFareMainHeader = [
    'position',
    'serviceCategory',
    'adultGroup',
    'childGroup',
    'seniorGroup',
  ];
  busCashFareSubHeader = [
    'subPosition',
    'subServiceCategory',
    'adultNo1',
    'adultNo2',
    'adultNo3',
    'adultNo4',
    'adultNo5',
    'adultNo6',
    'adultNo7',
    'adultNo8',
    'childNo1',
    'childNo2',
    'seniorNo1',
    'seniorNo2',
  ];

  userAccessList: DropdownList[] = [
    {
      id: '0',
      value: 'Administrator',
    },
    {
      id: '1',
      value: 'Maintenance Staff',
    },
    {
      id: '2',
      value: 'Not Authorized',
    },
    {
      id: '3',
      value: 'Operator',
    },
    {
      id: '4',
      value: 'Station Supervisor',
    },
  ];

  tab1Columns: string[] = ['no', 'user_staff_id', 'mdcs_access'];
  filterConfigs: IFilterConfig[] = [];

  constructor(private readonly paginationService: PaginationService) {}

  ngOnInit(): void {
    this.paginatedData$ = this.paginationService.paginatedData$;
    this.loadFilterValues();
  }

  loadFilterValues(): void {
    this.filterConfigs = [
      {
        controlName: 'mdcsAccess',
        value: [],
        type: 'array',
        options: this.userAccessList,
      },
    ];
  }
}
