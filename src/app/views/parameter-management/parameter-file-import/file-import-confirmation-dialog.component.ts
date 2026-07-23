import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-file-import-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Confirmation</h2>
      <mat-dialog-content>
        <p>By clicking "Yes", the selected file will be imported.</p>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button class="no-button" mat-button (click)="onNo()">No</button>
        <button class="yes-button" mat-flat-button (click)="onYes()">
          Yes
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
        padding: 16px 8px;
      }

      ::ng-deep .mat-mdc-dialog-surface {
        border-radius: 16px !important;
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
      }

      mat-dialog-content p {
        margin: 0;
        padding: 0px 20px;
        font-size: 20px;
        font-weight: 400;
        line-height: 24px;
        letter-spacing: 0px;
        color: #000000;
      }

      mat-dialog-actions {
        padding: 16px 0 0 0;
        gap: 12px;
        justify-content: center;
      }

      .no-button {
        width: 110px;
        height: 40px;
        border: 1px solid #4a5964 !important;
        background-color: transparent !important;
        color: #000000;
      }

      .yes-button {
        width: 110px;
        height: 40px;
        background-color: #0046ad !important;
        color: #ffffff !important;
      }

      .yes-button:hover {
        background-color: #003a8f !important;
      }
    `,
  ],
})
export class FileImportConfirmationDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<FileImportConfirmationDialogComponent>
  ) {}

  onNo(): void {
    this.dialogRef.close(false);
  }

  onYes(): void {
    this.dialogRef.close(true);
  }
}
