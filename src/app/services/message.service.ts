import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  ConfirmDialogModel,
  ConfirmationDialogComponent,
} from '../components/confirmation-dialog/confirmation-dialog.component';
import { ExportDialogComponent } from '../components/export-dialog/export-dialog.component';
import { throwError } from 'rxjs';
import { AppStore } from '@app/store/app.state';
import { Store } from '@ngrx/store';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { PayloadResponse } from '@app/models/common';
import MessageData from '@data/message-response.json';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(
    private router: Router,
    public dialog: MatDialog,
    private store: Store<AppStore>
  ) {}

  public multiError(err: HttpErrorResponse) {
    const multiMessage: string[] = [];
    const error = err.error;

    if (error != null || error != undefined) {
      if (error.errors != undefined && error.errors.length > 0) {
        error.errors.forEach((element: any) => {
          multiMessage.push(element.message);
        });
      } else {
        multiMessage.push(error.error);
      }

      if (err.status == 0) {
        this.store.dispatch(
          showSnackbar({
            message: err.error.message,
            title: 'Error',
            typeSnackbar: 'error',
          })
        );
      } else {
        this.store.dispatch(
          showSnackbar({
            message: multiMessage.toString(),
            title: 'Error',
            typeSnackbar: 'error',
          })
        );
      }
    } else {
      if (err != null && err.message != null) {
        if (err.status == 500) {
          this.store.dispatch(
            showSnackbar({
              message: 'System is offline',
              title: 'Error',
              typeSnackbar: 'error',
            })
          );
        } else if (err.status == 403 && err.statusText == 'Forbidden') {
          // 403 errors are now handled by sessionExpiryInterceptor
          // Skip handling here to avoid duplicate processing
          return throwError(err);
        } else {
          this.store.dispatch(
            showSnackbar({
              message: err.message,
              title: 'Error',
              typeSnackbar: 'error',
            })
          );
        }
      }
    }

    return throwError(err);
  }

  public MessageResponse(value: PayloadResponse, errorOnly: boolean) {
    //Note: Added ErrorOnly so we will check and status code and show error only.
    const response = MessageData.find(x => x.status === value.status);
    if (response != undefined || response != null) {
      if (!errorOnly)
        this.store.dispatch(
          showSnackbar({
            message: value.message,
            title: response.title,
            typeSnackbar: response.snackbar,
          })
        );
      else {
        if (response.snackbar == 'error')
          this.store.dispatch(
            showSnackbar({
              message: value.message,
              title: response.title,
              typeSnackbar: response.snackbar,
            })
          );
      }
      return true;
    }
    return false;
  }

  public singleError(err: HttpErrorResponse) {
    let message = '';
    const error = err.error.errors;
    error.forEach((element: any) => {
      message = message + element.message;
    });

    this.dialog.open(ConfirmationDialogComponent, {
      height: '25%',
      width: '20%',
      data: new ConfirmDialogModel('Error', message, [], true),
    });

    return throwError(err);
  }

  public confirmation(title: string, message: string) {
    return this.dialog.open(ConfirmationDialogComponent, {
      height: '30%',
      width: '25%',
      data: new ConfirmDialogModel(title, message, [], true),
    });
  }

  public warning(title: string, message: string) {
    return this.dialog.open(ConfirmationDialogComponent, {
      height: '30%',
      width: '25%',
      data: new ConfirmDialogModel(title, message, [], false),
    });
  }

  public openExportStatusDialog(title: string, items: any[]) {
    return this.dialog.open(ExportDialogComponent, {
      disableClose: true,
      width: '600px',
      data: {
        title,
        items,
      },
    });
  }
}
