import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { ImportFailedDialogComponent } from './import-failed-dialog.component';

describe('ImportFailedDialogComponent', () => {
  let component: ImportFailedDialogComponent;
  let fixture: ComponentFixture<ImportFailedDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ImportFailedDialogComponent>>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ImportFailedDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportFailedDialogComponent);
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
