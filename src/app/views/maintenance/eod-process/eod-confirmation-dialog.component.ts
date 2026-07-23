import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-eod-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Confirmation</h2>
      <mat-dialog-content>
        <p>
          By clicking "Confirm" the selected depot will trigger a manual EOD
          process.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button mat-stroked-button (click)="onClose()">Close</button>
        <button mat-flat-button color="primary" (click)="onConfirm()">
          Confirm
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        padding: 24px;
      }

      h2 {
        font-size: 32px !important;
        font-weight: 600 !important;
        line-height: 32px !important;
        margin: 0 0 16px 0;
        text-align: center;
        color: #000000;
      }

      mat-dialog-content {
        text-align: center;
        padding: 16px 0;
        min-width: 400px;
      }

      mat-dialog-content p {
        margin: 0;
        font-size: 20px;
        font-weight: 400;
        line-height: 24px;
        color: #000000;
      }

      mat-dialog-actions {
        padding: 16px 0 0 0;
        gap: 12px;
        justify-content: center;
      }

      button {
        min-width: 100px;
      }
    `,
  ],
})
export class EodConfirmationDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<EodConfirmationDialogComponent>
  ) {}

  onClose(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
