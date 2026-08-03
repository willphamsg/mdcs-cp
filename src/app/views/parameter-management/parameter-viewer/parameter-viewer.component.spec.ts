import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ParameterViewerService } from '@app/services/parameter-viewer.service';
import { DepoService } from '@app/services/depo.service';
import { AuthService } from '@app/services/auth.service';
import { of, throwError } from 'rxjs';
import { IParameterViewDetails } from '@app/models/parameter-management';
import { ParameterViewerComponent } from './parameter-viewer.component';

describe('ParameterViewerComponent', () => {
  let component: ParameterViewerComponent;
  let fixture: ComponentFixture<ParameterViewerComponent>;
  let mockParameterViewerService: jasmine.SpyObj<ParameterViewerService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(waitForAsync(() => {
    mockParameterViewerService = jasmine.createSpyObj('ParameterViewerService', [
      'getSystemParametersTab', 'getSystemParametersItems', 'getDataSource', 'getParameterList',
      'getSVTServiceNo', 'getSVTPayload',
    ]);
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([{ depot_id: '1', depot_name: 'Depot A' }]),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockAuthService.getSVCProvider.and.returnValue('1');

    mockParameterViewerService.getSystemParametersTab.and.returnValue(of({
      status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK',
      payload: { tabList: [{ id: 1, label: 'System' }] },
    }));
    mockParameterViewerService.getSystemParametersItems.and.returnValue(of({
      status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK',
      payload: { devices: [] },
    }));

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: ParameterViewerService, useValue: mockParameterViewerService },
        { provide: DepoService, useValue: mockDepoService },
        { provide: AuthService, useValue: mockAuthService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParameterViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tab items on init', () => {
    expect(mockParameterViewerService.getSystemParametersTab).toHaveBeenCalled();
  });

  it('should load parameter items after tabs load', () => {
    expect(mockParameterViewerService.getSystemParametersItems).toHaveBeenCalled();
  });

  it('should set active tab', () => {
    component.tabList = [{ id: 1, label: 'System', tab_code: 1 }];
    component.sideNavHeader = 1;
    component.setActiveTab();
    expect(component.tabIdx).toBe(0);
  });

  it('should clean up on destroy', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  it('should reset content on noContent', () => {
    component.noContent();
    expect(component.dataSource).toBeNull();
    expect(component.noDataFound).toBeTrue();
  });

  describe('loadData', () => {
    let mockParamVersion: IParameterViewDetails;

    beforeEach(() => {
      component.selectedParameterFile = {
        label: 'Test',
        item_code: 'code',
        parameter_view_details: [],
      } as any;
      component.parameterMultipleVersion = [
        {
          id: 10,
          parameter_name: 'fallback.dat',
          svc_provider_id: 1,
          is_location_specific: true,
          is_multi_version: false,
        },
      ];
      mockParamVersion = {
        id: 1,
        parameter_name: 'target.dat',
        is_location_specific: true,
      };
    });

    it('should return early without processing when status is not 200', () => {
      mockParameterViewerService.getDataSource.and.returnValue(
        of({
          status: 500,
          status_code: 'ERROR',
          timestamp: Date.now(),
          message: 'fail',
          payload: {},
        } as any)
      );
      spyOn(component as any, 'findMatchedParameterItem');

      component.loadData(mockParamVersion, '1');

      expect(component.noDataFound).toBeTrue();
      expect(component.dataSource).toBeNull();
      expect(component['findMatchedParameterItem']).not.toHaveBeenCalled();
    });

    it('should resolve a hex fileId on exact parameter_name match', () => {
      mockParameterViewerService.getDataSource.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            ParameterViewObjectList: [
              { parameter_name: 'other.dat', fileId: '0x99' },
              {
                parameter_name: 'target.dat',
                fileId: '0x1A',
                parameterPayloadDto: { jsondata: { a: 1 } },
              },
            ],
          },
        } as any)
      );
      mockParameterViewerService.getParameterList.and.returnValue(of([]));

      component.loadData(mockParamVersion, '1');

      expect(component.noDataFound).toBeFalse();
      expect(component.parameterName).toBe('target.dat');
      expect(component.payload.fileId).toBe(26);
      expect(
        mockParameterViewerService.getParameterList
      ).toHaveBeenCalledWith('target.dat');
    });

    it('should fall back to the parameterVersionSelected id when the single matched item has no fileId', () => {
      mockParameterViewerService.getDataSource.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            ParameterViewObjectList: [
              {
                parameter_name: 'unrelated.dat',
                parameterPayloadDto: { jsondata: {} },
              },
            ],
          },
        } as any)
      );
      mockParameterViewerService.getParameterList.and.returnValue(of([]));

      component.loadData(mockParamVersion, '1');

      expect(component.payload.fileId).toBe(mockParamVersion.id);
    });

    it('should call noParameterReturn when no match is found and the version is location specific', () => {
      mockParameterViewerService.getDataSource.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            ParameterViewObjectList: [
              { parameter_name: 'a.dat' },
              { parameter_name: 'b.dat' },
            ],
          },
        } as any)
      );
      spyOn(component, 'noParameterReturn');

      component.loadData(mockParamVersion, '1');

      expect(component.noParameterReturn).toHaveBeenCalled();
    });

    it('should NOT call noParameterReturn when no match is found and the version is not location specific', () => {
      mockParameterViewerService.getDataSource.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            ParameterViewObjectList: [
              { parameter_name: 'a.dat' },
              { parameter_name: 'b.dat' },
            ],
          },
        } as any)
      );
      spyOn(component, 'noParameterReturn');

      component.loadData(
        { ...mockParamVersion, is_location_specific: false },
        '1'
      );

      expect(component.noParameterReturn).not.toHaveBeenCalled();
    });

    it('should reset content when getDataSource errors', () => {
      mockParameterViewerService.getDataSource.and.returnValue(
        throwError(() => new Error('network error'))
      );
      spyOn(component, 'noContent').and.callThrough();

      component.loadData(mockParamVersion, '1');

      expect(component.noContent).toHaveBeenCalled();
      expect(component.dataSource).toBeNull();
      expect(component.noDataFound).toBeTrue();
    });
  });

  describe('findMatchedParameterItem (private)', () => {
    it('should return null for an undefined list', () => {
      expect(
        component['findMatchedParameterItem'](undefined, {
          parameter_name: 'x',
        })
      ).toBeNull();
    });

    it('should return null for an empty list', () => {
      expect(
        component['findMatchedParameterItem']([], { parameter_name: 'x' })
      ).toBeNull();
    });

    it('should return the exact match by parameter_name', () => {
      const list = [{ parameter_name: 'a' }, { parameter_name: 'b' }];
      const result = component['findMatchedParameterItem'](list, {
        parameter_name: 'b',
      });
      expect(result).toBe(list[1]);
    });

    it('should fall back to the single item when there is no exact match', () => {
      const list = [{ parameter_name: 'a' }];
      const result = component['findMatchedParameterItem'](list, {
        parameter_name: 'z',
      });
      expect(result).toBe(list[0]);
    });

    it('should return null when there are multiple items and no exact match', () => {
      const list = [{ parameter_name: 'a' }, { parameter_name: 'b' }];
      const result = component['findMatchedParameterItem'](list, {
        parameter_name: 'z',
      });
      expect(result).toBeNull();
    });
  });

  describe('resolveParameterFileId (private)', () => {
    it('should return the fallbackId when fileId is missing', () => {
      expect(component['resolveParameterFileId']({}, 42)).toBe(42);
    });

    it('should parse a hex string fileId', () => {
      expect(
        component['resolveParameterFileId']({ fileId: '0x1A' }, 0)
      ).toBe(26);
    });

    it('should return a plain string fileId unchanged', () => {
      expect(
        component['resolveParameterFileId']({ fileId: 'abc' }, 0)
      ).toBe('abc');
    });

    it('should return a numeric fileId unchanged', () => {
      expect(component['resolveParameterFileId']({ fileId: 123 }, 0)).toBe(
        123
      );
    });
  });

  describe('onSelectParameterFile', () => {
    it('resets selection state and loads data using the first parameter version', () => {
      spyOn(component, 'loadData');
      const parameterFile = {
        label: 'Test',
        item_code: 'code',
        parameter_view_details: [
          {
            id: 1,
            parameter_name: 'a.dat',
            is_location_specific: false,
            is_multi_version: true,
          },
        ],
      } as any;

      component.onSelectParameterFile(parameterFile, 'Some Code');

      expect(component.selectedItem).toBe('Some Code');
      expect(component.selectedParameterFile).toBe(parameterFile);
      expect(component.isSVT).toBeFalse();
      expect(component.busGroupNoSelected).toBeNull();
      expect(component.busGroupNoList).toEqual([]);
      expect(component.depotSelected).toBe('');
      expect(component.parameterVersionSelected).toBe(
        parameterFile.parameter_view_details[0]
      );
      expect(component.isLocationSpecific).toBeTrue();
      expect(component.isMultipleVersion).toBeTrue();
      expect(component.isDepotSelected).toBeFalse();
      expect(component.loadData).toHaveBeenCalledWith(
        component.parameterVersionSelected,
        ''
      );
    });

    it('defaults location-specific/multi-version state when there is no parameter version', () => {
      spyOn(component, 'loadData');
      const parameterFile = {
        label: 'Test',
        item_code: 'code',
        parameter_view_details: [],
      } as any;

      component.onSelectParameterFile(parameterFile, 'Some Code');

      expect(component.isLocationSpecific).toBeTrue();
      expect(component.isMultipleVersion).toBeFalse();
      expect(component.isDepotSelected).toBeFalse();
    });
  });

  describe('subscribeToDepoChanges', () => {
    it('sets depots and defaults depotSelected to the first depot id', () => {
      component.depots = [];
      component.depotSelected = '' as any;

      component.subscribeToDepoChanges();

      expect(component.depots).toEqual([
        { depot_id: '1', depot_name: 'Depot A' },
      ] as any);
      expect(component.depotSelected).toBe('1');
    });
  });

  describe('noParameterReturn', () => {
    it('builds a fallback parameter version from the first multiple-version entry, replacing the extension', () => {
      component.depotSelected = '9';
      component.parameterMultipleVersion = [
        {
          id: 10,
          parameter_name: 'fallback.dat',
          svc_provider_id: 3,
          is_location_specific: true,
          is_multi_version: true,
          locationSpecific: true,
          multiVersion: true,
          triable: true,
        } as any,
      ];

      component.noParameterReturn();

      expect(component.parameterVersionSelected).toEqual({
        id: 10,
        parameter_name: 'fallback.XXX',
        depot_id: 9,
        svc_provider_id: 3,
        is_location_specific: true,
        is_multi_version: true,
        locationSpecific: true,
        multiVersion: true,
        triable: true,
      });
    });

    it('defaults optional fields to false/0 when they are missing from the source entry', () => {
      component.depotSelected = '1';
      component.parameterMultipleVersion = [
        { id: 5, parameter_name: 'no-ext' } as any,
      ];

      component.noParameterReturn();

      expect(component.parameterVersionSelected.svc_provider_id).toBe(0);
      expect(component.parameterVersionSelected.is_location_specific).toBeFalse();
      expect(component.parameterVersionSelected.is_multi_version).toBeFalse();
      expect(component.parameterVersionSelected.locationSpecific).toBeFalse();
      expect(component.parameterVersionSelected.multiVersion).toBeFalse();
      expect(component.parameterVersionSelected.triable).toBeFalse();
    });
  });

  describe('loadServiceNo', () => {
    it('populates serviceNoList on a successful response', () => {
      mockParameterViewerService.getSVTServiceNo.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: { ParameterServiceNumberList: [1, 2, 3] },
        } as any)
      );

      component.loadServiceNo(5);

      expect(component.serviceNoList).toEqual([1, 2, 3]);
    });

    it('resets content when the request errors', () => {
      mockParameterViewerService.getSVTServiceNo.and.returnValue(
        throwError(() => new Error('fail'))
      );
      spyOn(component, 'noContent').and.callThrough();

      component.loadServiceNo(5);

      expect(component.noContent).toHaveBeenCalled();
    });
  });

  describe('loadSVTPayload', () => {
    it('sets the payload jsondata from the response on success', () => {
      mockParameterViewerService.getSVTPayload.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            ParameterViewObjectList: [
              { parameterPayloadDto: { jsondata: { a: 1 } } },
            ],
          },
        } as any)
      );

      component.loadSVTPayload(7);

      expect(component.payload.jsondata).toEqual({ a: 1 } as any);
    });

    it('defaults jsondata to an empty object when missing from the response', () => {
      mockParameterViewerService.getSVTPayload.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: { ParameterViewObjectList: [{}] },
        } as any)
      );

      component.loadSVTPayload(7);

      expect(component.payload.jsondata).toEqual({} as any);
    });

    it('resets content when the request errors', () => {
      mockParameterViewerService.getSVTPayload.and.returnValue(
        throwError(() => new Error('fail'))
      );
      spyOn(component, 'noContent').and.callThrough();

      component.loadSVTPayload(7);

      expect(component.noContent).toHaveBeenCalled();
    });
  });

  describe('handleSelectDepot', () => {
    beforeEach(() => {
      component.parameterMultipleVersion = [
        { id: 1, parameter_name: 'a.dat', depot_id: 1 } as any,
        { id: 2, parameter_name: 'b.dat', depot_id: 2 } as any,
      ];
      spyOn(component, 'loadData');
    });

    it('selects the matching version for the chosen depot and loads data', () => {
      component.handleSelectDepot('2');

      expect(component.depotSelected).toBe('2');
      expect(component.parameterVersionSelected).toBe(
        component.parameterMultipleVersion[1]
      );
      expect(component.loadData).toHaveBeenCalledWith(
        component.parameterVersionSelected,
        '2'
      );
    });

    it('falls back to noParameterReturn when no version matches the chosen depot', () => {
      spyOn(component, 'noParameterReturn');

      component.handleSelectDepot('999');

      expect(component.noParameterReturn).toHaveBeenCalled();
      expect(component.loadData).toHaveBeenCalled();
    });
  });

  describe('handleSelectMultipleVersion', () => {
    it('sets the selected version and loads data', () => {
      spyOn(component, 'loadData');
      const version = { id: 1, parameter_name: 'a.dat' } as any;

      component.handleSelectMultipleVersion(version);

      expect(component.parameterVersionSelected).toBe(version);
      expect(component.loadData).toHaveBeenCalledWith(
        version,
        component.depotSelected
      );
    });
  });

  describe('handleSelectBusGroup', () => {
    it('sets busGroupNoSelected and loads the service numbers', () => {
      spyOn(component, 'loadServiceNo');

      component.handleSelectBusGroup(42);

      expect(component.busGroupNoSelected).toBe(42);
      expect(component.loadServiceNo).toHaveBeenCalledWith(42);
    });
  });

  describe('handleSelectServiceNo', () => {
    it('sets serviceNoSelected and loads the SVT payload', () => {
      spyOn(component, 'loadSVTPayload');

      component.handleSelectServiceNo(11);

      expect(component.serviceNoSelected).toBe(11);
      expect(component.loadSVTPayload).toHaveBeenCalledWith(11);
    });
  });

  describe('onTabChange', () => {
    beforeEach(() => {
      component.tabList = [
        { id: 1, label: 'System', tab_code: 1 } as any,
        { id: 2, label: 'Device', tab_code: 2 } as any,
      ];
      spyOn(component.accordion(), 'closeAll');
      spyOn(component, 'loadParameterItems');
    });

    it('updates the active tab and loads its parameter items when a matching tab is found', () => {
      const event = { tab: { textLabel: 'Device' } } as any;

      component.onTabChange(event);

      expect(component.accordion().closeAll).toHaveBeenCalled();
      expect(component.menuHeader).toBe('Device');
      expect(component.sideNavHeader).toBe(2);
      expect(component.loadParameterItems).toHaveBeenCalledWith(2);
    });

    it('does not change the active tab when no matching label is found', () => {
      component.menuHeader = 'unchanged';
      component.sideNavHeader = 1;
      const event = { tab: { textLabel: 'Nonexistent' } } as any;

      component.onTabChange(event);

      expect(component.menuHeader).toBe('unchanged');
      expect(component.sideNavHeader).toBe(1);
      expect(component.loadParameterItems).not.toHaveBeenCalled();
    });
  });

  describe('applyMatchedParameterItem via loadData', () => {
    it('flags SVT data and stores bus group info when the matched item has a bus_group_list', () => {
      component.selectedParameterFile = {
        label: 'Test',
        item_code: 'code',
        parameter_view_details: [],
      } as any;
      component.parameterMultipleVersion = [];
      const paramVersion: any = { id: 1, parameter_name: 'svt.dat' };
      mockParameterViewerService.getDataSource.and.returnValue(
        of({
          status: 200,
          status_code: 'OK',
          timestamp: Date.now(),
          message: 'ok',
          payload: {
            ParameterViewObjectList: [
              {
                parameter_name: 'svt.dat',
                bus_group_list: [1, 2],
                parameter_payload_id: 55,
                parameterPayloadDto: { jsondata: {} },
              },
            ],
          },
        } as any)
      );
      mockParameterViewerService.getParameterList.and.returnValue(of([]));

      component.loadData(paramVersion, '1');

      expect(component.isSVT).toBeTrue();
      expect(component.busGroupNoList).toEqual([1, 2]);
      expect(component.payloadId).toBe(55);
    });
  });
});
