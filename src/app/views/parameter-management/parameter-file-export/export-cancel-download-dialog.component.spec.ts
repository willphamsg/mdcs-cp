import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { ExportCancelDownloadDialogComponent } from './export-cancel-download-dialog.component';

describe('ExportCancelDownloadDialogComponent', () => {
  let component: ExportCancelDownloadDialogComponent;
  let fixture: ComponentFixture<ExportCancelDownloadDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ExportCancelDownloadDialogComponent>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ExportCancelDownloadDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportCancelDownloadDialogComponent);
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
