import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { LogoutConfirmationDialogComponent } from './logout-confirmation-dialog.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('LogoutConfirmationDialogComponent', () => {
  let component: LogoutConfirmationDialogComponent;
  let fixture: ComponentFixture<LogoutConfirmationDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<LogoutConfirmationDialogComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [LogoutConfirmationDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LogoutConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog with false on cancel', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });

  it('should close dialog with true on confirm', () => {
    component.onConfirm();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });
});
