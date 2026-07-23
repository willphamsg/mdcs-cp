import { Component, Inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.css'],
  standalone: true,
  imports: [MatDialogActions, MatDialogContent, MatButton, MatDialogTitle],
})
export class ConfirmationDialogComponent {
  title: string;
  message: string;
  okOnly: boolean;
  multiMessage: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogModel
  ) {
    // Update view with given values
    this.title = data.title;
    this.message = data.message;
    this.okOnly = data.okOnly;
    this.multiMessage = data.multiMessage;
  }

  onConfirm(): void {
    // Close the dialog, return true
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    // Close the dialog, return false
    this.dialogRef.close(false);
  }
}

/**
 * Class to represent confirm dialog model.
 *
 * It has been kept here to keep it as part of shared component.
 */
export class ConfirmDialogModel {
  constructor(
    public title: string,
    public message: string,
    public multiMessage: string[] = [],
    public okOnly: boolean
  ) {}
}
