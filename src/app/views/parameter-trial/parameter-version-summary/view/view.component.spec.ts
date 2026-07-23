import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DepoService } from '@app/services/depo.service';
import { ParameterService } from '@app/services/parameter.service';
import { MessageService } from '@app/services/message.service';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { ViewComponent } from './view.component';

describe('ParameterVersionSummary ViewComponent', () => {
  let component: ViewComponent;
  let fixture: ComponentFixture<ViewComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockParameterService: jasmine.SpyObj<ParameterService>;
  let mockMessage: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ViewComponent>>;
  let mockStore: jasmine.SpyObj<Store>;

  const mockData = {
    title: 'Parameter Version Summary',
    action: 'view',
    selection: [
      {
        id: 1,
        version: 1,
        depot_id: 1,
        depot: { depot_name: 'Depot A' },
        parameter_name: 'Param1',
        parameter_version: '1.0',
      },
    ],
  };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([]),
    });
    mockParameterService = jasmine.createSpyObj('ParameterService', ['manage']);
    mockMessage = jasmine.createSpyObj('MessageService', ['confirmation', 'MessageResponse']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['closeAll']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: ParameterService, useValue: mockParameterService },
        { provide: MessageService, useValue: mockMessage },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: Store, useValue: mockStore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set title from dialog data', () => {
    expect(component.title).toBe('Parameter Version Summary');
  });

  it('should populate items from selection data', () => {
    expect(component.items).toHaveSize(1);
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toEqual(['depot', 'parameter_name', 'parameter_version']);
  });

  it('should have empty onSubmit (commented out)', () => {
    // onSubmit is effectively a no-op in this component
    expect(() => component.onSubmit()).not.toThrow();
  });
});
