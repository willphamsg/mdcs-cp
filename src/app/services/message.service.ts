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
    private readonly router: Router,
    public readonly dialog: MatDialog,
    private readonly store: Store<AppStore>
  ) {}

  public multiError(err: HttpErrorResponse) {
    const error = err.error;

    if (error != null) {
      this.dispatchErrorFromBody(err, error);
    } else if (err?.message != null) {
      const early = this.dispatchErrorWithoutBody(err);
      if (early) {
        return early;
      }
    }

    return throwError(err);
  }

  private dispatchErrorFromBody(err: HttpErrorResponse, error: any): void {
    const multiMessage: string[] = [];
    if (error.errors?.length > 0) {
      error.errors.forEach((element: any) => {
        multiMessage.push(element.message);
      });
    } else {
      multiMessage.push(error.error);
    }

    const message =
      err.status == 0 ? err.error.message : multiMessage.toString();
    this.store.dispatch(
      showSnackbar({
        message,
        title: 'Error',
        typeSnackbar: 'error',
      })
    );
  }

  private dispatchErrorWithoutBody(err: HttpErrorResponse) {
    if (err.status == 500) {
      this.store.dispatch(
        showSnackbar({
          message: 'System is offline',
          title: 'Error',
          typeSnackbar: 'error',
        })
      );
      return null;
    }
    if (err.status == 403 && err.statusText == 'Forbidden') {
      // 403 errors are now handled by sessionExpiryInterceptor
      return throwError(err);
    }
    this.store.dispatch(
      showSnackbar({
        message: err.message,
        title: 'Error',
        typeSnackbar: 'error',
      })
    );
    return null;
  }

  public MessageResponse(value: PayloadResponse, errorOnly: boolean) {
    //Note: Added ErrorOnly so we will check and status code and show error only.
    const response = MessageData.find(x => x.status === value.status);
    if (response == null) {
      return false;
    }
    if (!errorOnly || response.snackbar == 'error') {
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
