import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';

import { LayoutConfigService } from './layout-config.service';

describe('LayoutConfigService', () => {
  let service: LayoutConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayoutConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setLayoutConfig', () => {
    it('should set the device code and layout config without triggering the api when callApiOnPageSelect is false', () => {
      spyOn(service, 'triggerApi');

      service.setLayoutConfig('MDCS_ADPDT');

      let deviceCode: string | undefined;
      service.deviceCode$.subscribe(value => (deviceCode = value));
      expect(deviceCode).toBe('MDCS_ADPDT');

      let config: any;
      service.layoutConfig$.subscribe(value => (config = value));
      expect(config?.callApiOnPageSelect).toBeFalse();

      expect(service.triggerApi).not.toHaveBeenCalled();
    });

    it('should trigger the api automatically when callApiOnPageSelect is true', () => {
      spyOn(service, 'triggerApi').and.callThrough();

      service.setLayoutConfig('MDCS_DDPT');

      expect(service.triggerApi).toHaveBeenCalledWith({});

      let bottomData: any;
      service.bottomData$.subscribe(value => (bottomData = value));
      // MDCS_DDPT has no matching key in DummyData so it falls back to bank_card_bin
      expect(bottomData.dataSource).toEqual(
        DummyData.bank_card_bin.tableDetails.values.map(
          (data: any, index: number) => ({ id: index + 1, ...data })
        )
      );
    });

    it('should handle an unknown page key gracefully without throwing', () => {
      expect(() => service.setLayoutConfig('UNKNOWN_PAGE_KEY')).not.toThrow();

      let config: any;
      service.layoutConfig$.subscribe(value => (config = value));
      expect(config).toBeUndefined();

      let deviceCode: string | undefined;
      service.deviceCode$.subscribe(value => (deviceCode = value));
      expect(deviceCode).toBe('UNKNOWN_PAGE_KEY');
    });
  });

  describe('updateFieldValues', () => {
    it('should update the field values without triggering the api when no layout config is set', () => {
      spyOn(service, 'triggerApi');

      service.updateFieldValues({ foo: 'bar' });

      let fieldValues: any;
      service.topFieldValues$.subscribe(value => (fieldValues = value));
      expect(fieldValues).toEqual({ foo: 'bar' });
      expect(service.triggerApi).not.toHaveBeenCalled();
    });

    it('should trigger the api when a layout config is already set', () => {
      service.setLayoutConfig('MDCS_ADPDT');
      spyOn(service, 'triggerApi').and.callThrough();

      service.updateFieldValues({ foo: 'baz' });

      expect(service.triggerApi).toHaveBeenCalledWith({ foo: 'baz' });
    });
  });

  describe('areRequiredFieldsValid', () => {
    it('should return true when all required fields have truthy values', () => {
      const result = service.areRequiredFieldsValid(
        { depot: '1', operator: 'SBST' },
        ['depot', 'operator']
      );
      expect(result).toBeTrue();
    });

    it('should return false when a required field is missing or falsy', () => {
      const result = service.areRequiredFieldsValid(
        { depot: '1', operator: '' },
        ['depot', 'operator']
      );
      expect(result).toBeFalse();
    });

    it('should return true when there are no required fields to check', () => {
      const result = service.areRequiredFieldsValid({}, []);
      expect(result).toBeTrue();
    });
  });

  describe('triggerApi', () => {
    it('should fall back to bank_card_bin data when no device code has been set', () => {
      service.triggerApi();

      let bottomData: any;
      service.bottomData$.subscribe(value => (bottomData = value));
      expect(bottomData.dataSource).toEqual(
        DummyData.bank_card_bin.tableDetails.values.map(
          (data: any, index: number) => ({ id: index + 1, ...data })
        )
      );
    });

    it('should use matching dummy data when the device code exists in DummyData', () => {
      service.setLayoutConfig('MDCS_ADPDT');
      service.triggerApi({});

      let bottomData: any;
      service.bottomData$.subscribe(value => (bottomData = value));
      expect(bottomData.dataSource).toEqual(
        (DummyData as any).MDCS_ADPDT.tableDetails.values.map(
          (data: any, index: number) => ({ id: index + 1, ...data })
        )
      );
    });

    it('should update topData and userTable with parameter_viewer_depot_data', () => {
      service.triggerApi();

      let topData: any;
      service.topData$.subscribe(value => (topData = value));
      let userTable: any;
      service.userTable$.subscribe(value => (userTable = value));

      expect(topData).toEqual({
        userData: DummyData.parameter_viewer_depot_data,
      });
      expect(userTable).toEqual({
        userData: DummyData.parameter_viewer_depot_data,
      });
    });

    it('should map header sortable, subHeader and children fields into the bottom data columns', () => {
      spyOn(service, 'mapTableData').and.returnValue({
        headers: [
          { id: 'a', name: 'A', sortable: true, subHeader: ['x'] },
          { id: 'b', name: 'B', children: ['y'] },
          { id: 'c', name: 'C' },
        ],
        values: [],
      });

      service.triggerApi();

      let bottomData: any;
      service.bottomData$.subscribe(value => (bottomData = value));

      expect(bottomData.column).toEqual([
        { columnDef: 'a', header: 'A', sortable: true, subHeader: ['x'] },
        { columnDef: 'b', header: 'B', sortable: false, subHeader: ['y'] },
        { columnDef: 'c', header: 'C', sortable: false, subHeader: [] },
      ]);
    });
  });

  describe('mapTableData', () => {
    it('should prepend a No. column and number each row', () => {
      const responseData = {
        tableDetails: {
          header: [{ id: 'h1', name: 'H1' }],
          values: [{ h1: 'v1' }, { h1: 'v2' }],
        },
      };

      const result = service.mapTableData(responseData);

      expect(result.headers).toEqual([
        { id: 'id', name: 'No.' },
        { id: 'h1', name: 'H1' },
      ]);
      expect(result.values).toEqual([
        { id: 1, h1: 'v1' },
        { id: 2, h1: 'v2' },
      ]);
    });
  });

  describe('data update methods', () => {
    it('should update top data', () => {
      let topData: any;
      service.topData$.subscribe(value => (topData = value));
      service.updateTopData({ foo: 'bar' });
      expect(topData).toEqual({ foo: 'bar' });
    });

    it('should update user table data', () => {
      let userTable: any;
      service.userTable$.subscribe(value => (userTable = value));
      service.updateUserTable({ foo: 'bar' });
      expect(userTable).toEqual({ foo: 'bar' });
    });

    it('should update middle data', () => {
      let middleData: any;
      service.middleData$.subscribe(value => (middleData = value));
      service.updateMiddleData({ foo: 'bar' });
      expect(middleData).toEqual({ foo: 'bar' });
    });

    it('should update bottom data', () => {
      let bottomData: any;
      service.bottomData$.subscribe(value => (bottomData = value));
      service.updateBottomData({ foo: 'bar' });
      expect(bottomData).toEqual({ foo: 'bar' });
    });
  });

  describe('reset', () => {
    it('should reset the layout config and data subjects back to null', () => {
      service.setLayoutConfig('MDCS_ADPDT');
      service.updateTopData({ foo: 'bar' });
      service.updateUserTable({ foo: 'bar' });
      service.updateMiddleData({ foo: 'bar' });
      service.updateBottomData({ foo: 'bar' });

      service.reset();

      let layoutConfig: any;
      service.layoutConfig$.subscribe(value => (layoutConfig = value));
      let topData: any;
      service.topData$.subscribe(value => (topData = value));
      let userTable: any;
      service.userTable$.subscribe(value => (userTable = value));
      let middleData: any;
      service.middleData$.subscribe(value => (middleData = value));
      let bottomData: any;
      service.bottomData$.subscribe(value => (bottomData = value));

      expect(layoutConfig).toBeNull();
      expect(topData).toBeNull();
      expect(userTable).toBeNull();
      expect(middleData).toBeNull();
      expect(bottomData).toBeNull();
    });
  });

  describe('completeSubs', () => {
    it('should complete the top, middle and bottom data subjects', () => {
      const topComplete = jasmine.createSpy('topComplete');
      const middleComplete = jasmine.createSpy('middleComplete');
      const bottomComplete = jasmine.createSpy('bottomComplete');

      service.topData$.subscribe({ complete: topComplete });
      service.middleData$.subscribe({ complete: middleComplete });
      service.bottomData$.subscribe({ complete: bottomComplete });

      service.completeSubs();

      expect(topComplete).toHaveBeenCalled();
      expect(middleComplete).toHaveBeenCalled();
      expect(bottomComplete).toHaveBeenCalled();
    });
  });
});
