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
  selector: 'app-common-dialog',
  templateUrl: './common-dialog.component.html',
  styleUrls: ['./common-dialog.component.css'],
  imports: [MatDialogActions, MatDialogContent, MatButton, MatDialogTitle],
})
export class CommonDialogComponent {
  title: string;
  message: string;
  okOnly: boolean;
  multiMessage: string[] = [];
  cancelText: string = 'Cancel';
  confirmText: string = 'Confirm';

  constructor(
    public dialogRef: MatDialogRef<CommonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogModel
  ) {
    // Update view with given values
    this.title = data.title;
    this.message = data.message;
    this.okOnly = data.okOnly;
    this.multiMessage = data.multiMessage;
    this.cancelText = !!data.cancelText ? data.cancelText : 'Cancel';
    this.confirmText = !!data.confirmText ? data.confirmText : 'Confirm';
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
    public okOnly: boolean,
    public cancelText: string,
    public confirmText: string
  ) {}
}
