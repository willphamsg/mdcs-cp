import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { DepoService } from '@app/services/depo.service';
import { MasterService } from '@app/services/master.service';
import { CommonService } from '@app/services/common.service';
import { MessageService } from '@app/services/message.service';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
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
    mockCommonService = jasmine.createSpyObj('CommonService', [
      'getDepotIds',
      'validateBusNumber',
    ]);
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

  it('should return null from busNumFormatValidator when the control has no value', () => {
    const emptyControl = { value: '', touched: false } as any;
    expect(component['busNumFormatValidator'](emptyControl)).toBeNull();
  });

  describe('ngOnInit action detection', () => {
    it('sets up an update dialog from an existing selection without an action column', () => {
      const updateFixture = TestBed.createComponent(ViewComponent);
      const updateComponent = updateFixture.componentInstance;
      // Reassign (not mutate) `data` so the shared `mockData` singleton used
      // by other tests in this suite is left untouched.
      (updateComponent as any).data = {
        title: 'Vehicle',
        action: 'update',
        selection: [
          {
            id: 1,
            version: 0,
            bus_num: 'SBS1234',
            depot_id: '1',
            group_num: 1,
            svc_prov_id: 1,
            effective_date: '2024-01-01',
            updated_on: '',
            status: '',
          },
        ],
      };

      updateFixture.detectChanges();

      expect(updateComponent.isEdit).toBeTrue();
      expect(updateComponent.isDisabled).toBeTrue();
      expect(updateComponent.items).toHaveSize(1);
      expect(updateComponent.displayedColumns).toContain('effective_time');
      expect(updateComponent.displayedColumns).not.toContain('action');
      expect(updateComponent.displayedColumns).not.toContain('status');
    });

    it('sets up a delete dialog from an existing selection with a status column', () => {
      const deleteFixture = TestBed.createComponent(ViewComponent);
      const deleteComponent = deleteFixture.componentInstance;
      // Reassign (not mutate) `data` so the shared `mockData` singleton used
      // by other tests in this suite is left untouched.
      (deleteComponent as any).data = {
        title: 'Vehicle',
        action: 'delete',
        selection: [
          {
            id: 1,
            version: 0,
            bus_num: 'SBS1234',
            depot_id: '1',
            group_num: 1,
            svc_prov_id: 1,
            effective_date: '2024-01-01',
            updated_on: '',
            status: '',
          },
        ],
      };

      deleteFixture.detectChanges();

      expect(deleteComponent.isDelete).toBeTrue();
      expect(deleteComponent.displayedColumns).toContain('status');
      expect(deleteComponent.displayedColumns).not.toContain('effective_time');
      expect(deleteComponent.displayedColumns).not.toContain('action');
    });
  });

  describe('busHandler', () => {
    it('returns early without calling masterService when bus_num is under 5 characters', () => {
      component.items.at(0).get('bus_num')?.setValue('AB1');
      mockMasterService.find.calls.reset();

      component.busHandler(0);

      expect(mockMasterService.find).not.toHaveBeenCalled();
    });

    it('marks read-only fields hidden and patches date/time for INFO 3076/3079 statuses', () => {
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('depot_id')?.setValue('1');
      mockMasterService.find.and.returnValue(
        of({
          status: 200,
          status_code: 'INFO 3076',
          payload: { master_bus_entry: { effective_date: '2024-01-01T10:30:00' } },
        } as any)
      );

      component.busHandler(0);

      expect(component.items.at(0).get('hidden')?.value).toBeTrue();
      expect(component.items.at(0).get('effective_date')?.value).toBe('2024-01-01');
    });

    it('disables depot/date/time fields when status is "Bus Transfer Needed"', () => {
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('depot_id')?.setValue('1');
      mockMasterService.find.and.returnValue(
        of({ status: 200, status_code: 'INFO 3080', payload: {} } as any)
      );

      component.busHandler(0);

      expect(component.items.at(0).get('depot_id')?.disabled).toBeTrue();
      expect(component.items.at(0).get('effective_date')?.disabled).toBeTrue();
    });

    it('re-enables fields and clears hidden flag for a normal status', () => {
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('depot_id')?.setValue('1');
      mockMasterService.find.and.returnValue(
        of({ status: 200, status_code: 'INFO 3078', payload: {} } as any)
      );

      component.busHandler(0);

      expect(component.items.at(0).get('hidden')?.value).toBeFalse();
      expect(component.items.at(0).get('depot_id')?.disabled).toBeFalse();
    });

    it('sets status to Error! when the response status is not 200', () => {
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('depot_id')?.setValue('1');
      mockMasterService.find.and.returnValue(
        of({ status: 400, status_code: 'ERR', payload: {} } as any)
      );

      component.busHandler(0);

      expect(component.items.at(0).get('status')?.value).toBe('Error!');
    });
  });

  describe('updateDuplicateStatuses', () => {
    it('clears a previously set DUPLICATE status once no longer duplicated', () => {
      component.items.at(0).get('status')?.setValue('DUPLICATE');
      component.items.at(0).get('bus_num')?.setValue('UNIQUE1');
      component.items.at(0).get('depot_id')?.setValue('1');

      component.updateDuplicateStatuses();

      expect(component.items.at(0).get('status')?.value).toBe('');
    });

    it('marks duplicate combinations with DUPLICATE status', () => {
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('depot_id')?.setValue('1');
      component.addItem();
      component.items.at(1).get('bus_num')?.setValue('SBS1234');
      component.items.at(1).get('depot_id')?.setValue('1');

      component.updateDuplicateStatuses();

      expect(component.items.at(0).get('status')?.value).toBe('DUPLICATE');
      expect(component.items.at(1).get('status')?.value).toBe('DUPLICATE');
    });
  });

  describe('removeItem', () => {
    it('removes the item at the given index and re-checks duplicates', () => {
      component.addItem();
      expect(component.items).toHaveSize(2);

      component.removeItem(0);

      expect(component.items).toHaveSize(1);
    });
  });

  describe('reRenderTable', () => {
    it('updates rowCount when the MatTable ViewChild is present', () => {
      component.addItem();
      (component as any)._matTable = { renderRows: jasmine.createSpy('renderRows') };

      component.reRenderTable();

      expect((component as any)._matTable.renderRows).toHaveBeenCalled();
      expect(component.rowCount).toBe(component.items.length);
    });

    it('does nothing when the MatTable ViewChild is undefined', () => {
      (component as any)._matTable = undefined;
      const originalRowCount = component.rowCount;

      component.reRenderTable();

      expect(component.rowCount).toBe(originalRowCount);
    });
  });

  describe('checkDuplicate', () => {
    it('skips entries with a short or missing bus number/depot', () => {
      component.items.at(0).get('bus_num')?.setValue('AB1');
      component.items.at(0).get('depot_id')?.setValue('1');

      const result = component.checkDuplicate();

      expect(result.isDuplicate).toBeFalse();
    });

    it('treats bus numbers differing only by a trailing letter as the same combination', () => {
      component.items.at(0).get('bus_num')?.setValue('SBS1234A');
      component.items.at(0).get('depot_id')?.setValue('1');
      component.addItem();
      component.items.at(1).get('bus_num')?.setValue('SBS1234B');
      component.items.at(1).get('depot_id')?.setValue('1');

      const result = component.checkDuplicate();

      expect(result.isDuplicate).toBeTrue();
      expect(result.duplicates.length).toBe(1);
    });

    it('accumulates indices when a third matching entry is added', () => {
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('depot_id')?.setValue('1');
      component.addItem();
      component.items.at(1).get('bus_num')?.setValue('SBS1234');
      component.items.at(1).get('depot_id')?.setValue('1');
      component.addItem();
      component.items.at(2).get('bus_num')?.setValue('SBS1234');
      component.items.at(2).get('depot_id')?.setValue('1');

      const result = component.checkDuplicate();

      expect(result.isDuplicate).toBeTrue();
      expect(result.duplicates[0].indices).toEqual([0, 1, 2]);
    });
  });

  describe('isNotAllowedSubmit', () => {
    it('blocks submission when a "Bus Transfer Needed" status is present', () => {
      component.items.at(0).patchValue({
        bus_num: 'SBS1234',
        depot_id: '1',
        effective_date: '2024-01-01',
        effective_time: '10:00',
        status: 'INFO 3080',
      });

      expect(component.isNotAllowedSubmit()).toBeTrue();
    });

    it('blocks submission when there are duplicate entries', () => {
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

      expect(component.isNotAllowedSubmit()).toBeTrue();
    });

    it('blocks submission when the form has validation errors', () => {
      component.items.at(0).patchValue({ bus_num: '', depot_id: null });

      expect(component.isNotAllowedSubmit()).toBeTrue();
    });

    it('blocks submission when there are no items', () => {
      component.removeItem(0);
      expect(component.items.length).toBe(0);

      expect(component.isNotAllowedSubmit()).toBeTrue();
    });

    it('allows submission when the form is valid with no duplicates or transfer flags', () => {
      component.items.at(0).patchValue({
        bus_num: 'SBS1234',
        depot_id: '1',
        effective_date: '2024-01-01',
        effective_time: '10:00',
      });

      expect(component.isNotAllowedSubmit()).toBeFalse();
    });
  });

  describe('onSubmit', () => {
    it('does nothing further when the form is invalid', () => {
      component.items.at(0).patchValue({ bus_num: '', depot_id: null });

      component.onSubmit();

      expect(mockMasterService.add).not.toHaveBeenCalled();
      expect(mockMasterService.delete).not.toHaveBeenCalled();
      expect(component.submitAttempted).toBeTrue();
    });

    it('shows a warning and skips the service call when there are no items to save', () => {
      component.removeItem(0);
      // Force form to be considered valid with zero items.
      spyOnProperty(component.myForm, 'valid', 'get').and.returnValue(true);

      component.onSubmit();

      expect(mockMessage.confirmation).toHaveBeenCalledWith(
        'Warning',
        'No Record To Save'
      );
      expect(mockMasterService.add).not.toHaveBeenCalled();
    });

    it('adds a new record and closes the dialog on a successful response', () => {
      component.items.at(0).patchValue({
        bus_num: 'SBS1234',
        depot_id: '1',
        effective_date: '2024-01-01',
        effective_time: '10:00',
      });
      mockMasterService.add.and.returnValue(of({ status: 200 } as any));
      mockMessage.MessageResponse.and.returnValue(true);

      component.onSubmit();

      expect(mockMasterService.add).toHaveBeenCalled();
      expect(mockDialog.closeAll).toHaveBeenCalled();
    });

    it('does not close the dialog when MessageResponse reports failure on add', () => {
      component.items.at(0).patchValue({
        bus_num: 'SBS1234',
        depot_id: '1',
        effective_date: '2024-01-01',
        effective_time: '10:00',
      });
      mockMasterService.add.and.returnValue(of({ status: 400 } as any));
      mockMessage.MessageResponse.and.returnValue(false);

      component.onSubmit();

      expect(mockDialog.closeAll).not.toHaveBeenCalled();
    });

    it('reports a multiError when the add call fails', () => {
      component.items.at(0).patchValue({
        bus_num: 'SBS1234',
        depot_id: '1',
        effective_date: '2024-01-01',
        effective_time: '10:00',
      });
      mockMasterService.add.and.returnValue(throwError(() => ({ status: 500 } as any)));

      component.onSubmit();

      expect(mockMessage.multiError).toHaveBeenCalled();
    });

    it('reports a multiError when the delete call fails', () => {
      component.isDelete = true;
      component.items.at(0).patchValue({
        bus_num: 'SBS1234',
        depot_id: '1',
        effective_date: '2024-01-01',
        effective_time: '10:00',
      });
      mockMasterService.delete.and.returnValue(throwError(() => ({ status: 500 } as any)));

      component.onSubmit();

      expect(mockMessage.multiError).toHaveBeenCalled();
    });
  });

  describe('handleBusValidate', () => {
    it('delegates to commonService.validateBusNumber', () => {
      mockCommonService.validateBusNumber.and.returnValue(true);
      const event = {} as any;

      const result = component.handleBusValidate(event);

      expect(mockCommonService.validateBusNumber).toHaveBeenCalledWith(event);
      expect(result).toBeTrue();
    });
  });

  describe('getStatusValue', () => {
    it('returns an empty string while bus_num is under 5 characters', () => {
      component.items.at(0).get('bus_num')?.setValue('AB1');
      expect(component.getStatusValue(0)).toBe('');
    });

    it('returns "Bus transfer needed" for INFO 3080', () => {
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('status')?.setValue('INFO 3080');
      expect(component.getStatusValue(0)).toBe('Bus transfer needed');
    });

    it('returns "Bus No is duplicate" for DUPLICATE', () => {
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('status')?.setValue('DUPLICATE');
      expect(component.getStatusValue(0)).toBe('Bus No is duplicate');
    });

    it('returns an empty string for any other status', () => {
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('status')?.setValue('INFO 3078');
      expect(component.getStatusValue(0)).toBe('');
    });
  });

  describe('getHiddenValue', () => {
    it('returns the hidden control value', () => {
      component.items.at(0).get('hidden')?.setValue(true);
      expect(component.getHiddenValue(0)).toBeTrue();
    });
  });

  describe('getDateValue / getTimeValue', () => {
    it('returns an empty string when effective_date is null or undefined', () => {
      component.items.at(0).get('effective_date')?.setValue(null);
      expect(component.getDateValue(0)).toBe('');
    });

    it('returns the effective_date value when set', () => {
      component.items.at(0).get('effective_date')?.setValue('2024-01-01');
      expect(component.getDateValue(0)).toBe('2024-01-01');
    });

    it('returns an empty string when effective_time is null or undefined', () => {
      component.items.at(0).get('effective_time')?.setValue(undefined);
      expect(component.getTimeValue(0)).toBe('');
    });

    it('returns the effective_time value when set', () => {
      component.items.at(0).get('effective_time')?.setValue('10:00');
      expect(component.getTimeValue(0)).toBe('10:00');
    });
  });

  describe('getDepotName', () => {
    it('returns undefined when no depot matches the given id', () => {
      component.depots = [{ depot_id: '1', depot_name: 'Depot A' } as any];
      expect(component.getDepotName('999')).toBeUndefined();
    });

    it('returns the depot name for a matching id', () => {
      component.depots = [{ depot_id: '1', depot_name: 'Depot A' } as any];
      expect(component.getDepotName('1')).toBe('Depot A');
    });
  });

  describe('isReadOnlyForEffectiveFields', () => {
    it('returns true for INFO 3076 and INFO 3079 statuses', () => {
      component.items.at(0).get('status')?.setValue('INFO 3076');
      expect(component.isReadOnlyForEffectiveFields(0)).toBeTrue();

      component.items.at(0).get('status')?.setValue('INFO 3079');
      expect(component.isReadOnlyForEffectiveFields(0)).toBeTrue();
    });

    it('returns false for any other status', () => {
      component.items.at(0).get('status')?.setValue('INFO 3078');
      expect(component.isReadOnlyForEffectiveFields(0)).toBeFalse();
    });
  });

  describe('isBusTransferNeeded', () => {
    it('returns false when status_value control does not indicate a transfer', () => {
      expect(component.isBusTransferNeeded(0)).toBeFalse();
    });
  });
});
