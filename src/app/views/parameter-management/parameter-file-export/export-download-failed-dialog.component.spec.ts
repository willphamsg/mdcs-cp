import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { ExportDownloadFailedDialogComponent } from './export-download-failed-dialog.component';

describe('ExportDownloadFailedDialogComponent', () => {
  let component: ExportDownloadFailedDialogComponent;
  let fixture: ComponentFixture<ExportDownloadFailedDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ExportDownloadFailedDialogComponent>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ExportDownloadFailedDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportDownloadFailedDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on close', () => {
    component.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
