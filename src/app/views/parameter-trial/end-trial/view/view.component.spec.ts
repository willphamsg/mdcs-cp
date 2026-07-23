import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DepoService } from '@app/services/depo.service';
import { ParameterService } from '@app/services/parameter.service';
import { MessageService } from '@app/services/message.service';
import { Store } from '@ngrx/store';
import { EMPTY, of } from 'rxjs';
import { ViewComponent } from './view.component';

describe('EndTrial ViewComponent', () => {
  let component: ViewComponent;
  let fixture: ComponentFixture<ViewComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockParameterService: jasmine.SpyObj<ParameterService>;
  let mockMessage: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ViewComponent>>;
  let mockStore: jasmine.SpyObj<Store>;

  const mockData = {
    title: 'End Trial',
    action: 'end',
    selection: [
      {
        id: 1,
        version: 1,
        status_code: 'TRIAL',
        last_update: '2024-01-01',
        depot_id: 1,
        depot_name: 'Depot A',
        parameter_name: 'Param1',
        parameter_version: '1.0',
        effective_date_time: '2024-01-01',
        svc_prov_id: 1,
        param_master_id: 100,
      },
    ],
  };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([]),
    });
    mockParameterService = jasmine.createSpyObj('ParameterService', ['manage']);
    mockMessage = jasmine.createSpyObj('MessageService', ['confirmation', 'MessageResponse', 'multiError']);
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
    expect(component.title).toBe('End Trial');
  });

  it('should populate items from selection data', () => {
    expect(component.items).toHaveSize(1);
    expect(component.mode).toBe('end');
  });

  it('should call manage on valid submit', () => {
    mockParameterService.manage.and.returnValue(EMPTY);

    component.onSubmit();

    expect(mockParameterService.manage).toHaveBeenCalled();
  });
});
