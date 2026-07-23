import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { BreadcrumbsComponent } from '@app/components/layout/breadcrumbs/breadcrumbs.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { IHeader } from '@app/models/common';
import { IMessage } from '@app/models/message';
import { IFilterConfig } from '@app/shared/utils/form-utils';

@Component({
  selector: 'app-notification-list',
  imports: [
    BreadcrumbsComponent,
    MatTableModule,
    MatCardModule,
    MatToolbarModule,
    MatTabsModule,
    MatMenuModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PaginationComponent,
    SelectedFilterComponent,
  ],
  templateUrl: './notification-list.component.html',
  styleUrl: './notification-list.component.scss',
})
export class NotificationListComponent implements OnInit {
  notifications: IMessage[] = [];
  headerData = [
    {
      chk: true,
      field: 'id',
      name: 'No',
      hidden: false,
    },
    {
      chk: true,
      field: 'expectedDateTime',
      name: 'Expected Date Time',
      hidden: false,
    },
    {
      chk: true,
      field: 'description',
      name: 'Description',
      hidden: false,
    },
  ];
  tab1Columns: string[] = this.headerData.map((x: IHeader) => x.field);
  dataSource: any[] = [
    {
      expectedDateTime: '19/09/2024 12:11:23',
      description:
        'A new update is available for your application. Click here to install the update now.',
    },
    {
      expectedDateTime: '19/09/2024 11:02:34',
      description:
        'A new update is available for your application. Click here to install the update now.',
    },
    {
      expectedDateTime: '19/09/2024 10:11:23',
      description:
        'A new update is available for your application. Click here to install the update now.',
    },
    {
      expectedDateTime: '17/09/2024 12:11:23',
      description:
        'A new update is available for your application. Click here to install the update now.',
    },
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {}
}
