import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DepoService } from '@app/services/depo.service';
import { TrialDeviceSelectionService } from '@app/services/trial-device-selection.service';
import { MessageService } from '@app/services/message.service';
import { Store } from '@ngrx/store';
import { EMPTY, of } from 'rxjs';
import { ViewComponent } from './view.component';

describe('TrialDeviceSelection ViewComponent', () => {
  let component: ViewComponent;
  let fixture: ComponentFixture<ViewComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockTrialService: jasmine.SpyObj<TrialDeviceSelectionService>;
  let mockMessage: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ViewComponent>>;
  let mockStore: jasmine.SpyObj<Store>;

  const mockData = {
    title: 'Trial Device Selection',
    action: 'update',
    selection: [
      {
        id: 1,
        depot_id: 1,
        depot: 'Depot A',
        bus_num: 'SG1234',
        svc_provider_id: 1,
        trial_group: true,
        service_group: false,
        parameter_group: true,
      },
    ],
  };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([]),
    });
    mockTrialService = jasmine.createSpyObj('TrialDeviceSelectionService', ['manage']);
    mockMessage = jasmine.createSpyObj('MessageService', ['confirmation', 'MessageResponse', 'multiError']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['closeAll']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: TrialDeviceSelectionService, useValue: mockTrialService },
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
    expect(component.title).toBe('Trial Device Selection');
  });

  it('should populate items from selection data', () => {
    expect(component.items).toHaveSize(1);
    expect(component.isEdit).toBeTrue();
  });

  it('should toggle checkbox value', () => {
    const formGroup = component.items.at(0) as any;
    const initialValue = formGroup.get('trial_group')?.value;
    component.onCheckboxClick(formGroup, 'trial_group');
    expect(formGroup.get('trial_group')?.value).toBe(!initialValue);
  });

  it('should call manage on valid submit', () => {
    mockTrialService.manage.and.returnValue(EMPTY);

    component.onSubmit();

    expect(mockTrialService.manage).toHaveBeenCalled();
  });
});
