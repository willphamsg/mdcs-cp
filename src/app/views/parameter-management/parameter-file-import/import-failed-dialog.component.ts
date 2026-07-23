import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-import-failed-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="dialog-container">
      <div class="icon-wrapper">
        <img
          class="status-icon"
          src="/assets/icons/failed-download.svg"
          alt="Failed import icon" />
      </div>
      <h2 mat-dialog-title>Import Failed</h2>
      <mat-dialog-content>
        <p>
          Failed to import file(s) due to a backend issue. Please try
          again later or contact support if the problem persists.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button
          class="close-button"
          mat-flat-button
          color="primary"
          (click)="close()">
          Close
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dialog-container {
        padding: 24px 16px;
        text-align: center;
      }

      ::ng-deep .mat-mdc-dialog-surface {
        border-radius: 16px !important;
      }

      .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .status-icon {
        width: 56px;
        height: 56px;
      }

      h2 {
        font-size: 24px;
        font-weight: 600;
        margin: 0px;
        color: #000000;
      }

      mat-dialog-content p {
        margin: 0;
        font-size: 16px;
        line-height: 24px;
        color: #333333;
      }

      mat-dialog-actions {
        justify-content: center;
      }

      .close-button {
        width: 120px;
      }
    `,
  ],
})
export class ImportFailedDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<ImportFailedDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}

