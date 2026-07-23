import { Component, ViewChild, OnInit } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { UserService } from '../../../services/user.service';
import {
  PayloadRequest,
  PayloadResponse,
  Parameters,
} from '../../../models/common';

@Component({
    selector: 'app-user-view',
    templateUrl: './user-view.component.html',
    styleUrls: ['./user-view.component.scss'],
    imports: [MatTableModule, MatPaginatorModule]
})
export class UserViewComponent {
  displayedColumns: string[] = ['id', 'email', 'preferred_name'];
  dataSource = [];
  totalRows: number = 0;
  params: PayloadRequest = {
    page_size: 10,
    page_index: 1,
    sort_order: [],
    parameters: {} as Parameters,
  };

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private userService: UserService) {}
}
