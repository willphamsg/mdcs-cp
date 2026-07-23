import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DepoService } from '@app/services/depo.service';
import { ParameterService } from '@app/services/parameter.service';
import { MessageService } from '@app/services/message.service';
import { of } from 'rxjs';
import { ViewComponent } from './view.component';

describe('ParameterMode ViewComponent', () => {
  let component: ViewComponent;
  let fixture: ComponentFixture<ViewComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockParameterService: jasmine.SpyObj<ParameterService>;
  let mockMessage: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ViewComponent>>;

  const mockData = {
    title: 'Parameter Mode',
    action: 'live',
    remark: 'Test remark',
    selection: [
      {
        id: 1,
        version: 1,
        status_code: 'ACTIVE',
        last_update: '2024-01-01',
        depot_id: 1,
        depot_name: 'Depot A',
        parameter_name: 'Param1',
        parameter_version: '1.0',
        effective_date_time: '2024-01-01',
        svc_prov_id: 1,
        param_master_id: 100,
        scenario_details: {
          user_action_type: 'NONE',
          message: '',
          scenario_id: 1,
        },
      },
    ],
  };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([]),
    });
    mockParameterService = jasmine.createSpyObj('ParameterService', ['manage', 'trial', 'live']);
    mockMessage = jasmine.createSpyObj('MessageService', ['confirmation', 'MessageResponse', 'multiError']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['closeAll']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: ParameterService, useValue: mockParameterService },
        { provide: MessageService, useValue: mockMessage },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
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

  it('should set title and remark from dialog data', () => {
    expect(component.title).toBe('Parameter Mode');
    expect(component.remark).toBe('Test remark');
  });

  it('should populate items from selection data', () => {
    expect(component.items).toHaveSize(1);
    expect(component.currentAction).toBe('live');
  });

  it('should close dialog on onClose', () => {
    component.onClose('cancel');
    expect(mockDialogRef.close).toHaveBeenCalledWith('cancel');
  });

  it('should return correct showDefaultActions', () => {
    expect(component.showDefaultActions).toBeTrue();
    expect(component.showYesNoActions).toBeFalse();
    expect(component.showOkAction).toBeFalse();
  });

  it('should return display message for NONE action type', () => {
    const formGroup = component.items.at(0) as any;
    const message = component.getDisplayMessage(formGroup);
    expect(typeof message).toBe('string');
  });

  it('should check hasDisplayMessage', () => {
    const formGroup = component.items.at(0) as any;
    const has = component.hasDisplayMessage(formGroup);
    expect(typeof has).toBe('boolean');
  });

  it('should call live service on submit with live action', () => {
    mockParameterService.live.and.returnValue(of({
      status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK', payload: {},
    }));
    mockMessage.MessageResponse.and.returnValue(true);

    component.onSubmit();

    expect(mockParameterService.live).toHaveBeenCalled();
  });
});
