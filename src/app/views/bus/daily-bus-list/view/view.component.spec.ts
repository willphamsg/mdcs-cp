import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DepoService } from '@app/services/depo.service';
import { ManageDailyBusListService } from '@app/services/manage-daily-bus-list.service';
import { CommonService } from '@app/services/common.service';
import { MessageService } from '@app/services/message.service';
import { AuthService } from '@app/services/auth.service';
import { of, throwError } from 'rxjs';
import { ViewComponent } from './view.component';

describe('DailyBusList ViewComponent', () => {
  let component: ViewComponent;
  let fixture: ComponentFixture<ViewComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockDailyBusService: jasmine.SpyObj<ManageDailyBusListService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockMessage: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ViewComponent>>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockData = {
    title: 'Daily Bus List',
    action: 'add',
    selection: null,
  };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([{ depot_id: '1', depot_name: 'Depot A' }]),
    });
    mockDailyBusService = jasmine.createSpyObj('ManageDailyBusListService', ['manage', 'add']);
    mockCommonService = jasmine.createSpyObj('CommonService', [
      'getDepotIds',
      'validateBusNumber',
    ]);
    mockMessage = jasmine.createSpyObj('MessageService', ['confirmation', 'MessageResponse', 'multiError']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['closeAll']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockAuthService.getSVCProvider.and.returnValue('1');

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: ManageDailyBusListService, useValue: mockDailyBusService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessage },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: AuthService, useValue: mockAuthService },
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
    expect(component.title).toBe('Daily Bus List');
  });

  it('should initialize options from DayType data', () => {
    expect(component.options.length).toBeGreaterThan(0);
  });

  it('should add an item when no selection', () => {
    // When no selection, addItem is called
    expect(component.items).toHaveSize(1);
  });

  it('should return items FormArray from getter', () => {
    expect(component.items).toBeTruthy();
  });

  it('should get depot name by id', () => {
    component.depots = [{ depot_id: '1', depot_name: 'Depot A' }] as any;
    const name = component.getDepotName('1');
    expect(name).toBe('Depot A');
  });

  it('should check isArray correctly', () => {
    expect(component.isArray([])).toBeTrue();
    expect(component.isArray('test')).toBeFalse();
  });

  it('should get day type display string', () => {
    const display = component.getDayTypeDisplay([]);
    expect(display).toBe('');
  });

  // --- existingItems: day_type normalization IIFE (lines 220-223) ---
  describe('existingItems day_type normalization', () => {
    const baseElement: any = {
      id: 1,
      version: 1,
      depot_id: '1',
      depot_name: 'Depot A',
      bus_num: 'SBS1234',
      service_num: '25',
      svc_prov_id: 1,
      day: '',
      est_arrival_time: '08:00',
      est_arrival_count: 1,
      updated_on: '',
    };

    it('keeps day_type as-is when it is already an array', () => {
      const group = component.existingItems({
        ...baseElement,
        day_type: ['MON', 'TUE'],
      });
      expect(group.get('day_type')?.value).toEqual(['MON', 'TUE']);
    });

    it('wraps a truthy non-array day_type into a single-element array', () => {
      const group = component.existingItems({
        ...baseElement,
        day_type: 'MON',
      });
      expect(group.get('day_type')?.value).toEqual(['MON']);
    });

    it('produces an empty array when day_type is falsy', () => {
      const group = component.existingItems({
        ...baseElement,
        day_type: null,
      });
      expect(group.get('day_type')?.value).toEqual([]);
    });
  });

  // --- handleSvcValidate (line 296) ---
  describe('handleSvcValidate', () => {
    it('allows a valid alphanumeric keypress within length limit', () => {
      const event = {
        charCode: 51, // '3'
        target: { value: '123' },
        preventDefault: jasmine.createSpy('preventDefault'),
      };
      const result = component.handleSvcValidate(event);
      expect(result).toBeTrue();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('rejects a non-alphanumeric keypress', () => {
      const event = {
        which: 33, // '!'
        target: { value: '1' },
        preventDefault: jasmine.createSpy('preventDefault'),
      };
      const result = component.handleSvcValidate(event);
      expect(result).toBeFalse();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('rejects keypress once existing value already exceeds length 4', () => {
      const event = {
        charCode: 53, // '5'
        target: { value: '12345' },
        preventDefault: jasmine.createSpy('preventDefault'),
      };
      const result = component.handleSvcValidate(event);
      expect(result).toBeFalse();
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  // --- busNumFormatValidator (lines 358, 365, 372) ---
  describe('busNumFormatValidator via bound bus_num control', () => {
    let busNumControl: any;

    beforeEach(() => {
      busNumControl = component.items.at(0).get('bus_num');
    });

    it('rejects a value that fails the partial character pattern (line 358)', () => {
      // 4 leading letters exceed the {0,3} partial pattern allowance.
      busNumControl.setValue('ABCD1');
      busNumControl.updateValueAndValidity();
      expect(busNumControl.errors).toEqual(
        jasmine.objectContaining({ pattern: true })
      );
    });

    it('validates full pattern once length >= 6 and value is valid (line 365)', () => {
      busNumControl.setValue('SBS1234');
      busNumControl.updateValueAndValidity();
      expect(busNumControl.errors).toBeNull();
    });

    it('flags full pattern mismatch once length >= 6 (line 365)', () => {
      // Only 1 leading letter -> fails the {2,3}-letter full pattern.
      busNumControl.setValue('S1234A');
      busNumControl.updateValueAndValidity();
      expect(busNumControl.errors).toEqual(
        jasmine.objectContaining({ pattern: true })
      );
    });

    it('flags mismatch for touched short input under 6 chars (line 372)', () => {
      busNumControl.setValue('AB123');
      busNumControl.markAsTouched();
      busNumControl.updateValueAndValidity();
      expect(busNumControl.errors).toEqual(
        jasmine.objectContaining({ pattern: true })
      );
    });
  });

  // --- onFieldChange / updateBusIdValidators truthy/falsy branch (line 453) ---
  it('updates validity for populated and empty bus_num controls across items', () => {
    component.addItem();
    component.addItem();
    expect(component.items.length).toBe(3);

    const item0 = component.items.at(0);
    const item1 = component.items.at(1);
    const item2 = component.items.at(2);

    item0.get('depot_id')?.setValue('1');
    item0.get('bus_num')?.setValue('SBS1234');
    item0.get('day_type')?.setValue(['MON']);

    item1.get('depot_id')?.setValue('1');
    item1.get('bus_num')?.setValue('SBS1234');
    item1.get('day_type')?.setValue(['MON']);

    item2.get('depot_id')?.setValue('1');
    item2.get('bus_num')?.setValue('');

    component.onFieldChange(0, 'bus_num');

    expect(item0.get('bus_num')?.errors).toEqual(
      jasmine.objectContaining({ duplicateCombination: true })
    );
    expect(item1.get('bus_num')?.errors).toEqual(
      jasmine.objectContaining({ duplicateCombination: true })
    );
  });

  // --- onSubmit expandedItems day_type normalization (lines 613, 614, 616) ---
  it('normalizes day_type when expanding items on add submit', () => {
    const item0 = component.items.at(0);
    item0.get('depot_id')?.setValue('1');
    item0.get('bus_num')?.setValue('SBS1234');
    item0.get('day_type')?.setValue(['MON']);
    item0.get('est_arrival_time')?.setValue('08:00');
    item0.get('est_arrival_count')?.setValue(1);

    expect(component.myForm.valid).toBeTrue();

    spyOn(component.myForm, 'getRawValue').and.returnValue({
      items: [
        { bus_num: 'AAA1111', day_type: ['MON', 'TUE'] }, // array -> line 614
        { bus_num: 'BBB2222', day_type: 'WED' }, // truthy non-array -> line 616
        { bus_num: 'CCC3333', day_type: null }, // falsy -> line 616
      ],
    });
    mockDailyBusService.add.and.returnValue(of({} as any));

    component.onSubmit();

    expect(mockDailyBusService.add).toHaveBeenCalled();
    const expandedItems = mockDailyBusService.add.calls.mostRecent().args[0];
    expect(expandedItems.length).toBe(3);
    expect(expandedItems.map((i: any) => i.day_type)).toEqual([
      'MON',
      'TUE',
      'WED',
    ]);
  });

  describe('ngOnInit action detection', () => {
    const selectionElement = {
      id: 1,
      version: 0,
      depot_id: '1',
      depot_name: 'Depot A',
      bus_num: 'SBS1234',
      service_num: '25',
      svc_prov_id: 1,
      day_type: ['MON'],
      day: '',
      est_arrival_time: '08:00',
      est_arrival_count: 1,
      updated_on: '',
    };

    it('sets up a delete dialog, popping the action column', () => {
      const deleteFixture = TestBed.createComponent(ViewComponent);
      const deleteComponent = deleteFixture.componentInstance;
      (deleteComponent as any).data = {
        title: 'Daily Bus List',
        action: 'delete',
        selection: [selectionElement],
      };

      deleteFixture.detectChanges();

      expect(deleteComponent.isDelete).toBeTrue();
      expect(deleteComponent.displayedColumns).not.toContain('action');
      expect(deleteComponent.items).toHaveSize(1);
    });

    it('sets up an update dialog, removing the action column via splice', () => {
      const updateFixture = TestBed.createComponent(ViewComponent);
      const updateComponent = updateFixture.componentInstance;
      (updateComponent as any).data = {
        title: 'Daily Bus List',
        action: 'update',
        selection: [selectionElement],
      };

      updateFixture.detectChanges();

      expect(updateComponent.isUpdate).toBeTrue();
      expect(updateComponent.displayedColumns).not.toContain('action');
      expect(updateComponent.items).toHaveSize(1);
    });
  });

  describe('OnDestroy', () => {
    it('closes all dialogs', () => {
      component.OnDestroy();
      expect(mockDialog.closeAll).toHaveBeenCalled();
    });
  });

  describe('getDepotName', () => {
    it('returns undefined when no depot matches', () => {
      component.depots = [{ depot_id: '1', depot_name: 'Depot A' } as any];
      expect(component.getDepotName('999')).toBeUndefined();
    });
  });

  describe('getDayTypeDisplay', () => {
    it('returns an empty string for a non-array input', () => {
      expect(component.getDayTypeDisplay(null as any)).toBe('');
    });

    it('joins matching option labels for known day type ids', () => {
      const display = component.getDayTypeDisplay(['1']);
      expect(typeof display).toBe('string');
    });

    it('filters out unmatched ids and only joins the found labels', () => {
      const display = component.getDayTypeDisplay(['does-not-exist']);
      expect(display).toBe('');
    });
  });

  describe('removeItem', () => {
    it('does not remove the last remaining item', () => {
      expect(component.items).toHaveSize(1);
      component.removeItem(0);
      expect(component.items).toHaveSize(1);
    });

    it('removes an item when more than one is present', () => {
      component.addItem();
      expect(component.items).toHaveSize(2);
      component.removeItem(0);
      expect(component.items).toHaveSize(1);
    });
  });

  describe('handleSvcValidate additional branch', () => {
    it('rejects when neither charCode nor a matching key is present', () => {
      const event = {
        which: 0,
        target: { value: '' },
        preventDefault: jasmine.createSpy('preventDefault'),
      };
      const result = component.handleSvcValidate(event);
      expect(result).toBeFalse();
    });
  });

  describe('handleBusValidate', () => {
    it('delegates to commonService.validateBusNumber', () => {
      mockCommonService.validateBusNumber.and.returnValue(false);
      const event = {} as any;
      const result = component.handleBusValidate(event);
      expect(mockCommonService.validateBusNumber).toHaveBeenCalledWith(event);
      expect(result).toBeFalse();
    });
  });

  describe('onBusIdInput', () => {
    it('marks bus_num as touched and revalidates duplicates', () => {
      const busNumControl = component.items.at(0).get('bus_num');
      expect(busNumControl?.touched).toBeFalse();

      component.onBusIdInput(0);

      expect(busNumControl?.touched).toBeTrue();
    });
  });

  describe('duplicateBusIdValidator (via bus_num control)', () => {
    it('returns null when depot or day_type is missing', () => {
      const busNumControl = component.items.at(0).get('bus_num');
      busNumControl?.setValue('SBS1234');
      busNumControl?.updateValueAndValidity();
      expect(busNumControl?.errors).toBeNull();
    });

    it('flags a duplicate combination across two items with an overlapping day_type', () => {
      component.items.at(0).get('depot_id')?.setValue('1');
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('day_type')?.setValue(['1']);

      component.addItem();
      component.items.at(1).get('depot_id')?.setValue('1');
      component.items.at(1).get('bus_num')?.setValue('SBS1234');
      component.items.at(1).get('day_type')?.setValue(['1']);

      component.items.at(0).get('bus_num')?.updateValueAndValidity();
      component.items.at(1).get('bus_num')?.updateValueAndValidity();

      expect(component.items.at(0).get('bus_num')?.errors).toEqual(
        jasmine.objectContaining({ duplicateCombination: true })
      );
    });

    it('does not flag non-overlapping day types as duplicates', () => {
      component.items.at(0).get('depot_id')?.setValue('1');
      component.items.at(0).get('bus_num')?.setValue('SBS1234');
      component.items.at(0).get('day_type')?.setValue(['1']);

      component.addItem();
      component.items.at(1).get('depot_id')?.setValue('1');
      component.items.at(1).get('bus_num')?.setValue('SBS1234');
      component.items.at(1).get('day_type')?.setValue(['2']);

      component.items.at(0).get('bus_num')?.updateValueAndValidity();

      expect(component.items.at(0).get('bus_num')?.errors).toBeNull();
    });
  });

  describe('arrayNotEmptyValidator (via day_type control)', () => {
    it('flags an empty array as invalid', () => {
      const dayTypeControl = component.items.at(0).get('day_type');
      dayTypeControl?.setValue([]);
      expect(dayTypeControl?.errors).toEqual(
        jasmine.objectContaining({ arrayEmpty: true })
      );
    });

    it('flags a non-array value as invalid', () => {
      // The day_type control is bound to a real mat-select[multiple] in the
      // template, so Angular Material's own MatSelect.writeValue() throws
      // "Value must be an array in multiple-selection mode" the instant a
      // non-array value is set via setValue() - before our custom validator
      // ever runs. Invoke the validator function directly instead so we can
      // exercise the non-array branch without routing through the real
      // UI-bound control.
      const result = component['arrayNotEmptyValidator'](
        new FormControl('not-an-array')
      );
      expect(result).toEqual({ arrayEmpty: true });
    });

    it('passes validation for a non-empty array', () => {
      const dayTypeControl = component.items.at(0).get('day_type');
      dayTypeControl?.setValue(['1']);
      expect(dayTypeControl?.errors).toBeNull();
    });
  });

  describe('checkDuplicate day handling', () => {
    it('uses the `day` field for edit/delete mode combinations', () => {
      const deleteFixture = TestBed.createComponent(ViewComponent);
      const deleteComponent = deleteFixture.componentInstance;
      (deleteComponent as any).data = {
        title: 'Daily Bus List',
        action: 'delete',
        selection: [
          {
            id: 1,
            version: 0,
            depot_id: '1',
            depot_name: 'Depot A',
            bus_num: 'SBS1234',
            service_num: '25',
            svc_prov_id: 1,
            day_type: ['1'],
            day: 'Monday',
            est_arrival_time: '08:00',
            est_arrival_count: 1,
            updated_on: '',
          },
          {
            id: 2,
            version: 0,
            depot_id: '1',
            depot_name: 'Depot A',
            bus_num: 'SBS1234',
            service_num: '25',
            svc_prov_id: 1,
            day_type: ['1'],
            day: 'Monday',
            est_arrival_time: '08:00',
            est_arrival_count: 1,
            updated_on: '',
          },
        ],
      };

      deleteFixture.detectChanges();
      const result = deleteComponent.checkDuplicate();

      expect(result.isDuplicate).toBeTrue();
    });
  });

  describe('isNotAllowedSubmit', () => {
    it('blocks submission when there are duplicate entries', () => {
      component.items.at(0).patchValue({
        depot_id: '1',
        bus_num: 'SBS1234',
        day_type: ['1'],
        est_arrival_time: '08:00',
        est_arrival_count: 1,
      });
      component.addItem();
      component.items.at(1).patchValue({
        depot_id: '1',
        bus_num: 'SBS1234',
        day_type: ['1'],
        est_arrival_time: '09:00',
        est_arrival_count: 2,
      });

      expect(component.isNotAllowedSubmit()).toBeTrue();
    });

    it('blocks submission when the form has validation errors', () => {
      component.items.at(0).patchValue({ bus_num: '', depot_id: null });
      expect(component.isNotAllowedSubmit()).toBeTrue();
    });

    it('blocks submission when there are no items', () => {
      component.removeItem(0);
      // removeItem guards against removing the last item, so force it directly.
      component.items.clear();
      expect(component.isNotAllowedSubmit()).toBeTrue();
    });

    it('allows submission for a single valid, non-duplicate item', () => {
      component.items.at(0).patchValue({
        depot_id: '1',
        bus_num: 'SBS1234',
        day_type: ['1'],
        est_arrival_time: '08:00',
        est_arrival_count: 1,
      });
      expect(component.isNotAllowedSubmit()).toBeFalse();
    });
  });

  describe('onSubmit', () => {
    it('does nothing when the form is invalid', () => {
      component.items.at(0).patchValue({ bus_num: '', depot_id: null });
      component.onSubmit();
      expect(mockDailyBusService.add).not.toHaveBeenCalled();
      expect(component.submitAttempted).toBeTrue();
    });

    it('shows a warning when there are no items to submit', () => {
      component.items.at(0).patchValue({
        depot_id: '1',
        bus_num: 'SBS1234',
        day_type: ['1'],
        est_arrival_time: '08:00',
        est_arrival_count: 1,
      });
      spyOn(component.myForm, 'getRawValue').and.returnValue({ items: [] });

      component.onSubmit();

      expect(mockMessage.confirmation).toHaveBeenCalledWith(
        'Warning',
        'No Record To Save'
      );
      expect(mockDailyBusService.add).not.toHaveBeenCalled();
    });

    it('adds expanded items and closes the dialog on success (add action)', () => {
      component.items.at(0).patchValue({
        depot_id: '1',
        bus_num: 'SBS1234',
        day_type: ['1', '2'],
        est_arrival_time: '08:00',
        est_arrival_count: 1,
      });
      mockDailyBusService.add.and.returnValue(of({ status: 200 } as any));
      mockMessage.MessageResponse.and.returnValue(true);

      component.onSubmit();

      expect(mockDailyBusService.add).toHaveBeenCalled();
      expect(mockDialog.closeAll).toHaveBeenCalled();
    });

    it('reports a multiError when the add call fails', () => {
      component.items.at(0).patchValue({
        depot_id: '1',
        bus_num: 'SBS1234',
        day_type: ['1'],
        est_arrival_time: '08:00',
        est_arrival_count: 1,
      });
      mockDailyBusService.add.and.returnValue(
        throwError(() => ({ status: 500 } as any))
      );

      component.onSubmit();

      expect(mockMessage.multiError).toHaveBeenCalled();
    });

    it('calls manage and closes the dialog on success for update/delete actions', () => {
      const updateFixture = TestBed.createComponent(ViewComponent);
      const updateComponent = updateFixture.componentInstance;
      (updateComponent as any).data = {
        title: 'Daily Bus List',
        action: 'update',
        selection: [
          {
            id: 1,
            version: 0,
            depot_id: '1',
            depot_name: 'Depot A',
            bus_num: 'SBS1234',
            service_num: '25',
            svc_prov_id: 1,
            day_type: ['1'],
            day: 'Monday',
            est_arrival_time: '08:00',
            est_arrival_count: 1,
            updated_on: '',
          },
        ],
      };
      updateFixture.detectChanges();
      mockDailyBusService.manage.and.returnValue(of({ status: 200 } as any));
      mockMessage.MessageResponse.and.returnValue(true);

      updateComponent.onSubmit();

      expect(mockDailyBusService.manage).toHaveBeenCalled();
      expect(mockDialog.closeAll).toHaveBeenCalled();
    });

    it('reports a multiError when the manage (update/delete) call fails', () => {
      const updateFixture = TestBed.createComponent(ViewComponent);
      const updateComponent = updateFixture.componentInstance;
      (updateComponent as any).data = {
        title: 'Daily Bus List',
        action: 'update',
        selection: [
          {
            id: 1,
            version: 0,
            depot_id: '1',
            depot_name: 'Depot A',
            bus_num: 'SBS1234',
            service_num: '25',
            svc_prov_id: 1,
            day_type: ['1'],
            day: 'Monday',
            est_arrival_time: '08:00',
            est_arrival_count: 1,
            updated_on: '',
          },
        ],
      };
      updateFixture.detectChanges();
      mockDailyBusService.manage.and.returnValue(
        throwError(() => ({ status: 500 } as any))
      );

      updateComponent.onSubmit();

      expect(mockMessage.multiError).toHaveBeenCalled();
    });
  });
});
