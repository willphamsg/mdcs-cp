import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { DepoService } from '@app/services/depo.service';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { PLATFORM_ID } from '@angular/core';
import { of, BehaviorSubject } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let authSpy: any;
  let depoSpy: any;
  let commonSpy: any;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['isDagw', 'getSvcProvCode', 'fetchProfile', 'getDefaultDepot']);
    authSpy.fetchProfile.and.returnValue({ version: '2.1.0' });
    authSpy.getDefaultDepot.and.returnValue('1');
    authSpy.isDagw.and.returnValue(false);
    authSpy.getSvcProvCode.and.returnValue('SP1');

    depoSpy = { depo$: of('1'), depoList$: of([]) };
    
    commonSpy = jasmine.createSpyObj('CommonService', ['getGeneralInformation']);

    await TestBed.configureTestingModule({
      imports: [FooterComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: DepoService, useValue: depoSpy },
        { provide: CommonService, useValue: commonSpy },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set version from profile on init', () => {
    expect(component.version).toBe('2.1.0');
  });

  it('should subscribe to depot changes', () => {
    expect(component.depots).toEqual([]);
  });

  it('should count connected systems', () => {
    expect(component.connectedCount()).toBe(3);
  });

  it('should count disconnected systems', () => {
    expect(component.disconnectedCount()).toBe(2);
  });

  it('should detect browser platform', () => {
    expect(component.isBrowser()).toBeTrue();
  });

  it('should clean up on destroy', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('should count 0 connected systems when none are connected', () => {
    component.systems = [{ name: 'A', status: 0 }, { name: 'B', status: 0 }];
    expect(component.connectedCount()).toBe(0);
  });

  it('should count 0 disconnected systems when all are connected', () => {
    component.systems = [{ name: 'A', status: 1 }, { name: 'B', status: 1 }];
    expect(component.disconnectedCount()).toBe(0);
  });

  describe('loadGeneralInformation', () => {
    it('should update version, service provider and systems when general information is fully present', () => {
      commonSpy.getGeneralInformation.and.returnValue(
        of({
          payload: {
            general_information: {
              version: '3.0.0',
              service_provider: 'SP2',
              system_connection: [{ name: 'BOCC', status: 1 }],
            },
          },
        })
      );

      component.loadGeneralInformation();

      expect(component.version).toBe('3.0.0');
      expect(component.svcProvCode).toBe('SP2');
      expect(component.systems).toEqual([{ name: 'BOCC', status: 1 }]);
    });

    it('should not update fields when general_information fields are absent', () => {
      commonSpy.getGeneralInformation.and.returnValue(
        of({
          payload: {
            general_information: {},
          },
        })
      );
      const originalVersion = component.version;
      const originalSvcProvCode = component.svcProvCode;
      const originalSystems = component.systems;

      component.loadGeneralInformation();

      expect(component.version).toBe(originalVersion);
      expect(component.svcProvCode).toBe(originalSvcProvCode);
      expect(component.systems).toBe(originalSystems);
    });

    it('should do nothing when response payload has no general_information', () => {
      commonSpy.getGeneralInformation.and.returnValue(of({}));

      expect(() => component.loadGeneralInformation()).not.toThrow();
    });
  });

  describe('ngAfterViewInit', () => {
    it('should update currentDate on an interval when running in the browser', () => {
      jasmine.clock().install();
      try {
        component.ngAfterViewInit();
        const before = component.currentDate;
        jasmine.clock().tick(1000);
        expect(component.currentDate).not.toBe(before);
      } finally {
        jasmine.clock().uninstall();
      }
    });

    it('should not start the interval when not running in the browser', () => {
      component.isBrowser.set(false);
      const before = component.currentDate;
      component.ngAfterViewInit();
      expect(component.currentDate).toBe(before);
    });
  });

  describe('isDagw = true behaviour', () => {
    // Note: ngOnInit calls subscribeToDepoChanges() *then* unconditionally
    // overwrites `depot` from `profile.depot_list?.[0] || {}` when isDagw is
    // true, so the profile-driven branch is exercised via `profileDepotList`
    // while the subscribeToDepoChanges find()/fallback branches are
    // exercised by emitting on `depotListSubject` *after* creation, once the
    // ngOnInit-driven overwrite has already happened.
    async function createDagwFixture(profileDepotList: any[], initialDepots: any[] = []) {
      const dagwAuthSpy = jasmine.createSpyObj('AuthService', [
        'isDagw',
        'getSvcProvCode',
        'fetchProfile',
        'getDefaultDepot',
      ]);
      dagwAuthSpy.isDagw.and.returnValue(true);
      dagwAuthSpy.getSvcProvCode.and.returnValue('SP1');
      dagwAuthSpy.fetchProfile.and.returnValue({
        version: '2.1.0',
        depot_list: profileDepotList,
      });
      dagwAuthSpy.getDefaultDepot.and.returnValue('1');

      const depotListSubject = new BehaviorSubject<any[]>(initialDepots);
      const dagwDepoSpy = {
        depo$: of('1'),
        depoList$: depotListSubject.asObservable(),
      };

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [FooterComponent, RouterTestingModule],
        providers: [
          { provide: AuthService, useValue: dagwAuthSpy },
          { provide: DepoService, useValue: dagwDepoSpy },
          { provide: CommonService, useValue: commonSpy },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      }).compileComponents();

      const dagwFixture = TestBed.createComponent(FooterComponent);
      dagwFixture.detectChanges();
      return { component: dagwFixture.componentInstance, depotListSubject };
    }

    it('should set depot from the first item of profile depot_list on init when depot_list has entries', async () => {
      const { component: dagwComponent } = await createDagwFixture([
        { id: 9, version: 1, depot_id: '9', depot_code: 'D9', depot_name: 'Depot 9' },
      ]);

      expect(dagwComponent.depot).toEqual({
        id: 9,
        version: 1,
        depot_id: '9',
        depot_code: 'D9',
        depot_name: 'Depot 9',
      });
    });

    it('should default depot to an empty object on init when profile depot_list is empty', async () => {
      const { component: dagwComponent } = await createDagwFixture([]);

      expect(dagwComponent.depot).toEqual({} as any);
    });

    it('should resolve matching depot when depot list emits a matching entry', async () => {
      const { component: dagwComponent, depotListSubject } = await createDagwFixture([]);
      const matchingDepot = {
        id: 1,
        version: 1,
        depot_id: '1',
        depot_code: 'D1',
        depot_name: 'Depot 1',
      };

      depotListSubject.next([
        matchingDepot,
        { id: 2, version: 1, depot_id: '2', depot_code: 'D2', depot_name: 'Depot 2' },
      ]);

      expect(dagwComponent.depot).toEqual(matchingDepot);
    });

    it('should fall back to an empty object when no depot in the list matches the default depot', async () => {
      const { component: dagwComponent, depotListSubject } = await createDagwFixture([]);

      depotListSubject.next([
        { id: 2, version: 1, depot_id: '2', depot_code: 'D2', depot_name: 'Depot 2' },
      ]);

      expect(dagwComponent.depot).toEqual({} as any);
    });
  });
});
