import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SnackbarComponent } from './snackbar.component';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { hideSnackbar } from '@store/snackbar/snackbar.actions';

describe('SnackbarComponent', () => {
  let component: SnackbarComponent;
  let fixture: ComponentFixture<SnackbarComponent>;
  let snackBarRefSpy: jasmine.SpyObj<MatSnackBarRef<SnackbarComponent>>;
  let store: MockStore;

  describe('with string message', () => {
    beforeEach(async () => {
      snackBarRefSpy = jasmine.createSpyObj('MatSnackBarRef', ['dismiss', 'afterDismissed']);
      snackBarRefSpy.afterDismissed.and.returnValue(of({ dismissedByAction: true } as any));

      await TestBed.configureTestingModule({
        imports: [SnackbarComponent],
        providers: [
          { provide: MAT_SNACK_BAR_DATA, useValue: { message: 'Test message', type: 'success' } },
          { provide: MatSnackBarRef, useValue: snackBarRefSpy },
          provideMockStore({})
        ]
      })
      .compileComponents();
      
      store = TestBed.inject(MockStore);
      spyOn(store, 'dispatch');
      fixture = TestBed.createComponent(SnackbarComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should identify message as string', () => {
      expect(component.isMessageString).toBeTrue();
    });

    it('should dismiss snackbar', () => {
      component.dismiss();
      expect(snackBarRefSpy.dismiss).toHaveBeenCalled();
    });

    it('should dispatch hideSnackbar after dismissed', () => {
      expect(store.dispatch).toHaveBeenCalledWith(hideSnackbar());
    });
  });

  describe('with array message', () => {
    beforeEach(async () => {
      snackBarRefSpy = jasmine.createSpyObj('MatSnackBarRef', ['dismiss', 'afterDismissed']);
      snackBarRefSpy.afterDismissed.and.returnValue(of({ dismissedByAction: false } as any));

      await TestBed.configureTestingModule({
        imports: [SnackbarComponent],
        providers: [
          { provide: MAT_SNACK_BAR_DATA, useValue: { message: [{ title: 'err', message: 'oops' }] } },
          { provide: MatSnackBarRef, useValue: snackBarRefSpy },
          provideMockStore({})
        ]
      })
      .compileComponents();
      
      fixture = TestBed.createComponent(SnackbarComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should identify message as not a string', () => {
      expect(component.isMessageString).toBeFalse();
    });
  });
});
