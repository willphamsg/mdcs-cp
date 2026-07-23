import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { EodConfirmationDialogComponent } from './eod-confirmation-dialog.component';

describe('EodConfirmationDialogComponent', () => {
  let component: EodConfirmationDialogComponent;
  let fixture: ComponentFixture<EodConfirmationDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<EodConfirmationDialogComponent>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [EodConfirmationDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EodConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog with false on onClose', () => {
    component.onClose();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should close dialog with true on onConfirm', () => {
    component.onConfirm();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
