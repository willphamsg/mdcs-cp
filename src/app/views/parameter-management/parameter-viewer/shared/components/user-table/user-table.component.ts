import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule],
  templateUrl: './user-table.component.html',
  styleUrl: './user-table.component.scss',
})
export class UserTableComponent {
  @Input() dataSource: any | null = null;

  displayedColumns: string[] = [
    'fileId',
    'parameter_name',
    'parameter_version',
    'format_version',
    'effective_date_time',
  ];

  constructor() {
    console.log(this.dataSource);
  }
}
