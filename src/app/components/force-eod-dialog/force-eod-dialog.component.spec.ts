import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForceEodDialogComponent, ConfirmDialogModel } from './force-eod-dialog.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ForceEodDialogComponent', () => {
  let component: ForceEodDialogComponent;
  let fixture: ComponentFixture<ForceEodDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ForceEodDialogComponent>>;

  const mockDialogData = new ConfirmDialogModel('EOD Title', 'Force EOD?', ['bus1', 'bus2'], true);

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ForceEodDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ForceEodDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set title and message from dialog data', () => {
    expect(component.title).toBe('EOD Title');
    expect(component.message).toBe('Force EOD?');
  });

  it('should set okOnly and multiMessage from dialog data', () => {
    expect(component.okOnly).toBeTrue();
    expect(component.multiMessage).toEqual(['bus1', 'bus2']);
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
