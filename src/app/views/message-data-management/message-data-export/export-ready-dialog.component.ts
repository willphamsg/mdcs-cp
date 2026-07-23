import { CommonModule } from '@angular/common';
import {
  Component,
  Inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';

export interface MessageExportReadyDialogData {
  title: string;
  items: any[];
}

@Component({
  selector: 'app-message-export-ready-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatTableModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <mat-dialog-content>
      <table mat-table class="stripped" [dataSource]="data.items">
        <ng-container matColumnDef="message_data_filename">
          <th mat-header-cell *matHeaderCellDef>Message Data File Name</th>
          <td mat-cell *matCellDef="let element">
            {{ element.message_data_filename }}
          </td>
        </ng-container>

        <ng-container matColumnDef="sequence_no">
          <th mat-header-cell *matHeaderCellDef>Sequence No</th>
          <td mat-cell *matCellDef="let element">
            {{ element.sequence_no }}
          </td>
        </ng-container>

        <ng-container matColumnDef="modified_date_time">
          <th mat-header-cell *matHeaderCellDef>Modified Date Time</th>
          <td mat-cell *matCellDef="let element">
            {{ element.modified_date_time | date: 'dd/MM/yyyy HH:mm' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let element">
            <span
            [ngClass]="{
              'status-green':
                element.status === 'Exported' || element.status === 'success',
              'status-red': element.status === 'Fail',
            }">
              {{ element.status }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="description">
          <th mat-header-cell *matHeaderCellDef>Description</th>
          <td mat-cell *matCellDef="let element">
            {{ element.description }}
          </td>
        </ng-container>

        <tr
          style="
            background-color: #4a5964;
            font-weight: 600;
            color: white;
            height: 40px;
          "
          mat-header-row
          *matHeaderRowDef="displayedColumns; sticky: true"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        (click)="download()">
        Download
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 720px;
      }

      h2 {
        font-size: 24px !important;
        font-weight: 600 !important;
      }

      table {
        width: 100%;
      }

      mat-dialog-content {
        max-height: 60vh;
        overflow: auto;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        gap: 12px;
      }
    `,
  ],
})

export class MessageExportReadyDialogComponent {
  displayedColumns: string[] = [
    'message_data_filename',
    'sequence_no',
    'modified_date_time',
    'status',
    'description',
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MessageExportReadyDialogData,
    private readonly dialogRef: MatDialogRef<MessageExportReadyDialogComponent>
  ) {}

  download(): void {
    this.dialogRef.close('download');
  }

  cancel(): void {
    this.dialogRef.close('cancel');
  }
}