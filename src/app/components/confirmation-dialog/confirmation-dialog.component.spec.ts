import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationDialogComponent, ConfirmDialogModel } from './confirmation-dialog.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ConfirmationDialogComponent>>;

  const mockDialogData = new ConfirmDialogModel('Title', 'Message', ['err1'], false);

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set title and message from dialog data', () => {
    expect(component.title).toBe('Title');
    expect(component.message).toBe('Message');
  });

  it('should set okOnly and multiMessage from dialog data', () => {
    expect(component.okOnly).toBeFalse();
    expect(component.multiMessage).toEqual(['err1']);
  });

  it('should close dialog with true on confirm', () => {
    component.onConfirm();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('should close dialog with false on dismiss', () => {
    component.onDismiss();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
