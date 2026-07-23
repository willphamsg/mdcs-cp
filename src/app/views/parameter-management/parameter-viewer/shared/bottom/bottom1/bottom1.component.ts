import { Component, Input, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import {
  TableColumn,
  WrapperTableComponent,
} from '@app/components/wrapper-table/wrapper-table.component';

@Component({
  selector: 'app-bottom1',
  standalone: true,
  imports: [WrapperTableComponent, MatTableModule, PaginationComponent],
  templateUrl: './bottom1.component.html',
  styleUrl: './bottom1.component.scss',
})
export class Bottom1Component implements OnInit {
  @Input() data: any;
  dataSource = [];

  columns: TableColumn<any>[] = [];

  constructor() {}

  ngOnInit(): void {
    console.log('Bottom 1 ', this.data);
    this.columns = this.data?.column;
    this.dataSource = this.data?.dataSource;
  }
}
