import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportDialogComponent } from './export-dialog.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ExportDialogComponent', () => {
  let component: ExportDialogComponent;
  let fixture: ComponentFixture<ExportDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ExportDialogComponent>>;

  const mockItems = [
    { param_file_name: 'file1.xml', param_payload_version: 1, status: 'Ready' },
    { param_file_name: 'file2.xml', param_payload_version: 2, status: 'Pending' },
  ];
  const mockDialogData = { items: mockItems };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ExportDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate dataSource from dialog data on ngOnInit', () => {
    expect(component.dataSource).toEqual(mockItems);
  });

  it('should have correct displayedColumns', () => {
    expect(component.displayedColumns).toEqual(['param_file_name', 'param_payload_version', 'status']);
  });

  it('should close dialog with confirm on confirm', () => {
    component.confirm();
    expect(dialogRefSpy.close).toHaveBeenCalledWith('confirm');
  });

  it('should close dialog with cancel on cancel', () => {
    component.cancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith('cancel');
  });
});
