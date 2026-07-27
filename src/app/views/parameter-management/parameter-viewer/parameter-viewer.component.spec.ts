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
});
