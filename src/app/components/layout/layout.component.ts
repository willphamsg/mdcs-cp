import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { RouterOutlet, Router } from '@angular/router';
import { SnackbarComponent } from '@components/snackbar/snackbar.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppStore } from '@store/app.state';
import { Store } from '@ngrx/store';
import { showSnackbar } from '@store/snackbar/snackbar.actions';
import { InactivityTimeoutService } from '@app/services/inactivity-timeout.service';

@Component({
    selector: 'app-layout',
    imports: [
        HeaderComponent,
        FooterComponent,
        RouterOutlet,
        MatSnackBarModule,
    ],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit, OnDestroy {
  @ViewChild('container') container: ElementRef;

  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly store: Store<AppStore>,
    private readonly router: Router,
    private readonly inactivityTimeoutService: InactivityTimeoutService
  ) {
    this.store.select(state => state.snackbar).subscribe((state: any) => {
      // console.log('state', state);
      if (state?.show) {
        this.snackBar.openFromComponent(SnackbarComponent, {
          data: {
            message: state?.message,
            type: state?.typeSnackbar,
            title: state?.title,
          },
          duration: 3000,
          panelClass: [
            'custom-snackbar',
            `${state?.typeSnackbar === 'success' ? 'custom-snackbar-success' : 'custom-snackbar-error'}`,
          ],
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      }
    });
  }

  ngOnInit(): void {
    this.inactivityTimeoutService.start();

    this.router.events.subscribe(() => {
      if (this.container) {
        this.container.nativeElement.scrollTop = 0;
        this.container.nativeElement.scrollLeft = 0;
      }
    });
  }

  ngOnDestroy(): void {
    this.inactivityTimeoutService.stop();
  }

  openSnackBar(isArray?: boolean) {
    this.store.dispatch(
      showSnackbar({
        message: isArray
          ? [
              {
                title: 'error 1',
                message: 'error message 1',
              },
              {
                title: 'error 1',
                message: 'error message 1',
              },
            ]
          : 'sample message',
        title: 'sample title',
        typeSnackbar: isArray ? 'error' : 'success',
      })
    );
  }
}
