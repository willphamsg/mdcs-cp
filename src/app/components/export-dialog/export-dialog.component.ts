import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

export interface ExportReadyTableHeader {
  param_file_name: string;
  param_payload_version: number;
  status: string;
}

@Component({
  selector: 'app-export-dialog',
  imports: [MatButtonModule, MatDialogModule, MatTableModule],
  templateUrl: './export-dialog.component.html',
  styleUrl: './export-dialog.component.scss',
})
export class ExportDialogComponent implements OnInit {
  displayedColumns: string[] = [
    'param_file_name',
    'param_payload_version',
    'status',
  ];
  dataSource: ExportReadyTableHeader[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ExportDialogComponent>
  ) {}

  ngOnInit(): void {
    this.dataSource = this.data.items;
  }

  confirm(): void {
    this.dialogRef.close('confirm');
  }

  cancel(): void {
    this.dialogRef.close('cancel');
  }
}
