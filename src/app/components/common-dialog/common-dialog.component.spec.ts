import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonDialogComponent, ConfirmDialogModel } from './common-dialog.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('CommonDialogComponent', () => {
  let component: CommonDialogComponent;
  let fixture: ComponentFixture<CommonDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CommonDialogComponent>>;

  const mockDialogData = new ConfirmDialogModel('Test Title', 'Test Message', ['msg1', 'msg2'], false, 'No', 'Yes');

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [CommonDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CommonDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set title and message from dialog data', () => {
    expect(component.title).toBe('Test Title');
    expect(component.message).toBe('Test Message');
  });

  it('should set okOnly from dialog data', () => {
    expect(component.okOnly).toBeFalse();
  });

  it('should set multiMessage from dialog data', () => {
    expect(component.multiMessage).toEqual(['msg1', 'msg2']);
  });

  it('should set custom cancel and confirm text', () => {
    expect(component.cancelText).toBe('No');
    expect(component.confirmText).toBe('Yes');
  });

  it('should use default cancelText when not provided', () => {
    const data = new ConfirmDialogModel('T', 'M', [], false, '', '');
    const comp = new CommonDialogComponent(dialogRefSpy, data);
    expect(comp.cancelText).toBe('Cancel');
    expect(comp.confirmText).toBe('Confirm');
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
