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
    mockMasterService = jasmine.createSpyObj('MasterService', [
      'find',
      'add',
      'delete',
    ]);
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
    expect(component.items).toHaveSize(1);
  });

  it('should have status options', () => {
    expect(component.statusOptions.length).toBeGreaterThan(0);
  });

  it('should return items FormArray from getter', () => {
    expect(component.items).toBeTruthy();
  });

  it('should warn about duplicates and abort save without calling masterService', () => {
    component.items.at(0).patchValue({
      bus_num: 'SBS1234',
      depot_id: '1',
      effective_date: '2024-01-01',
      effective_time: '10:00',
    });
    component.addItem();
    component.items.at(1).patchValue({
      bus_num: 'SBS1234',
      depot_id: '1',
      effective_date: '2024-01-02',
      effective_time: '11:00',
    });

    component.onSubmit();

    expect(mockMessage.confirmation).toHaveBeenCalledWith(
      'Duplicate Detected',
      jasmine.stringMatching('SBS1234')
    );
    expect(mockMasterService.add).not.toHaveBeenCalled();
    expect(mockMasterService.delete).not.toHaveBeenCalled();
  });

  it('should call masterService.delete when isDelete is true and there are no duplicates', () => {
    component.isDelete = true;
    component.items.at(0).patchValue({
      bus_num: 'SBS1234',
      depot_id: '1',
      effective_date: '2024-01-01',
      effective_time: '10:00',
    });
    mockMasterService.delete.and.returnValue(of({ status: 200 } as any));
    mockMessage.MessageResponse.and.returnValue(true);

    component.onSubmit();

    expect(mockMasterService.delete).toHaveBeenCalled();
    expect(mockDialog.closeAll).toHaveBeenCalled();
  });

  it('should validate bus number format for input of 6+ characters', () => {
    const control = { value: 'SBS1234', touched: false } as any;
    expect(component['busNumFormatValidator'](control)).toBeNull();

    const badControl = { value: 'SB12345', touched: false } as any;
    expect(component['busNumFormatValidator'](badControl)).toEqual({
      pattern: true,
    });
  });

  it('should validate bus number format for short, touched input', () => {
    const touchedInvalid = { value: 'SBS12', touched: true } as any;
    expect(component['busNumFormatValidator'](touchedInvalid)).toEqual({
      pattern: true,
    });

    const touchedValidPrefix = { value: 'SB123', touched: true } as any;
    expect(component['busNumFormatValidator'](touchedValidPrefix)).toEqual({
      pattern: true,
    });

    const untouchedShort = { value: 'SBS12', touched: false } as any;
    expect(component['busNumFormatValidator'](untouchedShort)).toBeNull();
  });
});
