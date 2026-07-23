import { Component, Inject } from '@angular/core';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { hideSnackbar } from '@store/snackbar/snackbar.actions';
import { Store } from '@ngrx/store';
import { AppStore } from '@store/app.state';

@Component({
  selector: 'app-snackbar',
  imports: [MatButtonModule],
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.scss',
})
export class SnackbarComponent {
  isMessageString: boolean;
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: any,
    private readonly store: Store<AppStore>,
    public snackBarRef: MatSnackBarRef<SnackbarComponent>
  ) {
    this.isMessageString = typeof this.data?.message === 'string';
    this.snackBarRef?.afterDismissed().subscribe(() => {
      this.store.dispatch(hideSnackbar());
    });
  }
  dismiss() {
    this.snackBarRef.dismiss();
  }
}
