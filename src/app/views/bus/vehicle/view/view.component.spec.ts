import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { DepoService } from '@app/services/depo.service';
import { MasterService } from '@app/services/master.service';
import { CommonService } from '@app/services/common.service';
import { MessageService } from '@app/services/message.service';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { ViewComponent } from './view.component';

describe('Vehicle ViewComponent', () => {
  let component: ViewComponent;
  let fixture: ComponentFixture<ViewComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockMasterService: jasmine.SpyObj<MasterService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockMessage: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockStore: jasmine.SpyObj<Store>;

  const mockData = {
    title: 'Vehicle',
    action: 'add',
    selection: null,
  };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depo$: of('1'),
      depoList$: of([{ depot_id: '1', depot_name: 'Depot A' }]),
    });
    mockMasterService = jasmine.createSpyObj('MasterService', ['find']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockMessage = jasmine.createSpyObj('MessageService', ['confirmation', 'MessageResponse', 'multiError']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['closeAll']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: MasterService, useValue: mockMasterService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessage },
        { provide: MatDialog, useValue: mockDialog },
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

  it('should initialize as add action', () => {
    expect(component.isAdd).toBeTrue();
    expect(component.isDelete).toBeFalse();
    expect(component.isEdit).toBeFalse();
  });

  it('should add an item when no selection', () => {
    expect(component.items.length).toBe(1);
  });

  it('should have status options', () => {
    expect(component.statusOptions.length).toBeGreaterThan(0);
  });

  it('should return items FormArray from getter', () => {
    expect(component.items).toBeTruthy();
  });
});
