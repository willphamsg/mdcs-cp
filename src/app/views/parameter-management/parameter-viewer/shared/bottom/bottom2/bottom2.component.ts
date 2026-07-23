import { Component, Input, OnInit } from '@angular/core';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import {
  TableColumn,
  WrapperTableComponent,
} from '@app/components/wrapper-table/wrapper-table.component';

@Component({
  selector: 'app-bottom2',
  standalone: true,
  imports: [WrapperTableComponent, PaginationComponent],
  templateUrl: './bottom2.component.html',
  styleUrl: './bottom2.component.scss',
})
export class Bottom2Component implements OnInit {
  @Input() data: any;
  dataSource = [];

  columns: TableColumn<any>[] = [];

  constructor() {}

  ngOnInit(): void {
    console.log('Bottom 2 ', this.data);
    this.columns = this.data?.column;
    this.dataSource = this.data?.dataSource;
  }
}
