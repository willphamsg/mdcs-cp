import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { ViewComponent } from './view.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DepoService } from '@app/services/depo.service';
import { ManageDailyBusListService } from '@app/services/manage-daily-bus-list.service';
import { MessageService } from '@app/services/message.service';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import DummyData from '@data/db.json';
import { MatTableModule } from '@angular/material/table';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('ParameterFileImportViewComponent', () => {
  let component: ViewComponent;
  let fixture: ComponentFixture<ViewComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ViewComponent>>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockManageService: jasmine.SpyObj<ManageDailyBusListService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockStore: jasmine.SpyObj<Store<any>>;

  beforeEach(waitForAsync(() => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close', 'open']);
    mockDepoService = jasmine.createSpyObj('DepoService', [
      'depo$',
      'depoList$',
    ]);
    mockManageService = jasmine.createSpyObj('ManageDailyBusListService', [
      'manage',
    ]);
    mockMessageService = jasmine.createSpyObj('MessageService', [
      'confirmation',
    ]);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    mockDepoService.depo$ = of('testDepot');
    mockDepoService.depoList$ = of(DummyData.depot_list);

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, MatTableModule, BrowserAnimationsModule],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: DepoService, useValue: mockDepoService },
        { provide: ManageDailyBusListService, useValue: mockManageService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: Store, useValue: mockStore },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should add an item to the form array', () => {
    const initialLength = component.items.length;
    component.addItem();
    expect(component.items.length).toBe(initialLength + 1);
  });

  it('should remove an item from the form array', () => {
    component.addItem();
    const initialLength = component.items.length;
    component.removeItem(1);
    expect(component.items.length).toBe(initialLength - 1);
  });

  it('should not remove the last item from the form array', () => {
    expect(component.items.length).toBe(1);
    component.removeItem(0);
    expect(component.items.length).toBe(1);
  });

  it('should handle file import and set filename in the form group', () => {
    const mockFile = new File(['file content'], 'test-file.txt', {
      type: 'text/plain',
    });
    const event = { target: { files: [mockFile] } };
    component.addItem();
    component.importHandler(event, 0);
    const fileNameControl = component.items.at(0).get('fileName');
    expect(fileNameControl?.value).toBe('test-file.txt');
  });

  it('should display a snackbar message on successful form submission', fakeAsync(() => {
    mockManageService.manage.and.returnValue(
      of({
        status: 1,
        status_code: '',
        timestamp: 1,
        message: '',
        payload: '',
      })
    );

    component.ngOnInit();

    const validFormData = {
      depot: 'test',
      fileName: 'test-file.txt',
    };

    component.items.at(0).setValue(validFormData);
    component.onSubmit();

    tick(10000);
    expect(mockStore.dispatch).toHaveBeenCalled();
    flush();
  }));

  it('should show an error snackbar if submission fails', fakeAsync(() => {
    const validFormData = {
      depot: 'test',
      fileName: 'test-file.txt',
    };

    component.items.at(0).setValue(validFormData);

    mockManageService.manage.and.returnValue(
      throwError(() => new Error('Error'))
    );

    component.onSubmit();

    tick();
    expect(mockStore.dispatch).toHaveBeenCalled();
    flush();
  }));

  it('should get depot name based on depot id', () => {
    const depotName = component.getDepotName('1');
    expect(depotName).toBe('Hougang Depot');
  });
});
