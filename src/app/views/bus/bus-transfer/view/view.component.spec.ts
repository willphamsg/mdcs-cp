import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DepoService } from '@app/services/depo.service';
import { ManageBusTransferService } from '@app/services/bus-transfer.service';
import { MessageService } from '@app/services/message.service';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { BusTransferViewComponent } from './view.component';

describe('BusTransferViewComponent', () => {
  let component: BusTransferViewComponent;
  let fixture: ComponentFixture<BusTransferViewComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockBusTransferService: jasmine.SpyObj<ManageBusTransferService>;
  let mockMessage: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<BusTransferViewComponent>>;
  let mockStore: jasmine.SpyObj<Store>;

  const mockData = {
    title: 'Bus Transfer',
    action: 'update',
    selection: [
      {
        id: 1,
        version: 1,
        bus_num: 'SG1234',
        bus_id: 10,
        current_depot: 'D1',
        current_depot_name: ['Depot A'],
        current_operator: 'OP1',
        current_operator_name: 'Operator A',
        current_effective_date: '2024-01-01T00:00:00',
        future_depot: 'D2',
        future_depot_name: ['Depot B'],
        future_operator: 'OP2',
        future_operator_name: 'Operator B',
        target_effective_date: '2024-02-01T10:00:00',
        future_effective_date: '2024-02-01',
      },
    ],
  };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([]),
    });
    mockBusTransferService = jasmine.createSpyObj('ManageBusTransferService', ['manage']);
    mockMessage = jasmine.createSpyObj('MessageService', ['confirmation', 'MessageResponse', 'multiError']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['closeAll']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: ManageBusTransferService, useValue: mockBusTransferService },
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
    fixture = TestBed.createComponent(BusTransferViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set title from dialog data', () => {
    expect(component.title).toBe('Bus Transfer');
  });

  it('should populate items from selection', () => {
    expect(component.items).toHaveSize(1);
    expect(component.isEdit).toBeTrue();
  });

  it('should set mode from action', () => {
    expect(component.mode).toBe('update');
  });
});
