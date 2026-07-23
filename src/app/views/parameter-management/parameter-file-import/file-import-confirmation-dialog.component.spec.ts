import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { FileImportConfirmationDialogComponent } from './file-import-confirmation-dialog.component';

describe('FileImportConfirmationDialogComponent', () => {
  let component: FileImportConfirmationDialogComponent;
  let fixture: ComponentFixture<FileImportConfirmationDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<FileImportConfirmationDialogComponent>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [FileImportConfirmationDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FileImportConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog with false on onNo', () => {
    component.onNo();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should close dialog with true on onYes', () => {
    component.onYes();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
