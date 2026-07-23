import { Component, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { UserService } from '../../../services/user.service';
import { PayloadRequest, Parameters } from '../../../models/common';

@Component({
    selector: 'app-user-view',
    templateUrl: './user-view.component.html',
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

  constructor(private readonly userService: UserService) {}
}
