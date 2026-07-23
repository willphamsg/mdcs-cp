import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-logout-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <mat-icon class="warning-icon">warning</mat-icon>
        <h2 mat-dialog-title>Confirm Logout</h2>
      </div>
      <div mat-dialog-content class="dialog-content">
        <p>Are you sure you want to log out?</p>
      </div>
      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-btn">
          Cancel
        </button>
        <button
          mat-raised-button
          color="primary"
          (click)="onConfirm()"
          class="confirm-btn">
          Log Out
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        padding: 20px;
        text-align: center;
      }

      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
      }

      .warning-icon {
        color: #ff9800;
        margin-right: 10px;
        font-size: 24px;
      }

      h2 {
        margin: 0;
        color: #333;
      }

      .dialog-content {
        margin: 20px 0;
      }

      .dialog-content p {
        margin: 0;
        font-size: 16px;
        color: #666;
      }

      .dialog-actions {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 20px;
      }

      .cancel-btn {
        min-width: 80px;
      }

      .confirm-btn {
        min-width: 80px;
      }
    `,
  ],
})
export class LogoutConfirmationDialogComponent {
  private dialogRef = inject(MatDialogRef<LogoutConfirmationDialogComponent>);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
