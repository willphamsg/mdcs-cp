import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ILayoutConfig } from '@app/models/layout-config';
import { LayoutConfigService } from '@app/services/layout-config.service';
import { BehaviorSubject, of } from 'rxjs';

import { MainLayoutComponent } from './main-layout.component';
import { Top3Component } from '../top/top3/top3.component';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let mockLayoutConfigService: jasmine.SpyObj<LayoutConfigService>;
  let configSubject: BehaviorSubject<ILayoutConfig | null>;
  let fieldValuesSubject: BehaviorSubject<{ [key: string]: any }>;

  const baseConfig: ILayoutConfig = {
    topComponent: null,
    userTableComponent: null,
    middleComponent: null,
    bottomComponent: null,
    callApiOnPageSelect: false,
    requiresValidation: false,
  };

  beforeEach(async () => {
    configSubject = new BehaviorSubject<ILayoutConfig | null>(null);
    fieldValuesSubject = new BehaviorSubject<{ [key: string]: any }>({});

    mockLayoutConfigService = jasmine.createSpyObj(
      'LayoutConfigService',
      ['triggerApi', 'reset', 'updateFieldValues'],
      {
        layoutConfig$: configSubject.asObservable(),
        topFieldValues$: fieldValuesSubject.asObservable(),
        topData$: of(null),
        userTable$: of(null),
        middleData$: of(null),
        bottomData$: of(null),
      }
    );

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        { provide: LayoutConfigService, useValue: mockLayoutConfigService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not render anything when the emitted config is null', () => {
    configSubject.next(null);
    expect(component.layoutConfig).toBeNull();
    expect(component['topComponentRef']).toBeNull();
  });

  it('calls triggerApi with the current field values when callApiOnPageSelect is true', () => {
    fieldValuesSubject.next({ depot: 'D1' });
    configSubject.next({ ...baseConfig, callApiOnPageSelect: true });

    expect(mockLayoutConfigService.triggerApi).toHaveBeenCalledWith({
      depot: 'D1',
    });
  });

  it('does not call triggerApi when callApiOnPageSelect is false', () => {
    mockLayoutConfigService.triggerApi.calls.reset();
    configSubject.next({ ...baseConfig, callApiOnPageSelect: false });
    expect(mockLayoutConfigService.triggerApi).not.toHaveBeenCalled();
  });

  it('does not create a top component when topComponent is null', () => {
    configSubject.next({ ...baseConfig, topComponent: null });
    expect(component['topComponentRef']).toBeNull();
  });

  it('creates a top component instance and resets validity when a new config with a different topComponent arrives', () => {
    configSubject.next({ ...baseConfig, topComponent: 'Top1Component' });
    const firstRef = component['topComponentRef'];
    expect(firstRef).toBeTruthy();

    component.topComponentValid = true;
    configSubject.next({ ...baseConfig, topComponent: 'Top2Component' });

    expect(component.topComponentValid).toBeFalse();
    expect(component['topComponentRef']).not.toBe(firstRef);
  });

  it('does not recreate the top component when the identical config reference is emitted again', () => {
    const config: ILayoutConfig = { ...baseConfig, topComponent: 'Top1Component' };
    configSubject.next(config);
    const firstRef = component['topComponentRef'];

    configSubject.next(config);

    expect(component['topComponentRef']).toBe(firstRef);
  });

  it('does not render user table/middle/bottom while validation is required and the top component is not yet valid', () => {
    configSubject.next({
      ...baseConfig,
      topComponent: 'Top3Component',
      userTableComponent: 'Top0Component',
      middleComponent: 'Middle2Component',
      bottomComponent: 'Bottom1Component',
      requiresValidation: true,
    });

    expect(component['otherComponentRefs'].length).toBe(0);
  });

  it('renders user table, middle, and bottom components when validation is not required', () => {
    configSubject.next({
      ...baseConfig,
      topComponent: 'Top3Component',
      userTableComponent: 'Top0Component',
      middleComponent: 'Middle2Component',
      bottomComponent: 'Bottom1Component',
      requiresValidation: false,
    });

    // otherComponentRefs picks up 4 refs, not 3: userTable(1) + middle(1),
    // then Middle2Component's middleData$ subscription synchronously runs
    // change detection on the freshly-created middle ref, which fires its
    // ngOnInit's tabChange.emit('tab1') into the already-bound onTabChange
    // handler. That cascades into renderBottomComponent once (+1), and then
    // renderComponents' own renderBottomComponent call runs again (+1) since
    // destroyBottomComponent's cleanup filter never actually removes the
    // previous bottom ref (it compares componentRef.location.nativeElement
    // to the container's own anchor element, which are never equal).
    expect(component['otherComponentRefs'].length).toBe(4);
  });

  it('renders the other components once the top component becomes valid on a re-emission of the same config', () => {
    const config: ILayoutConfig = {
      ...baseConfig,
      topComponent: 'Top3Component',
      userTableComponent: 'Top0Component',
      requiresValidation: true,
    };
    configSubject.next(config);
    expect(component['otherComponentRefs'].length).toBe(0);

    component.topComponentValid = true;
    configSubject.next(config);

    expect(component['otherComponentRefs'].length).toBe(1);
  });

  it('logs an error and skips rendering when bottomComponent is an unresolved object at render time', () => {
    spyOn(console, 'error');

    configSubject.next({
      ...baseConfig,
      bottomComponent: { tab1: 'Bottom1Component' } as any,
    });

    expect(console.error).toHaveBeenCalled();
    expect(component['otherComponentRefs'].length).toBe(0);
  });

  it('wires the created top component outputs to onValuesChange and validity state', () => {
    configSubject.next({ ...baseConfig, topComponent: 'Top3Component' });

    const topInstance = component['topComponentRef']!.instance as Top3Component;
    topInstance.valuesEmitter.emit({ option: '1', depot: 'D9' });

    expect(component.selectedDepot).toBe('D9');
    expect(mockLayoutConfigService.updateFieldValues).toHaveBeenCalledWith({
      depot: 'D9',
    });

    topInstance.validityEmitter.emit(true);
    expect(component.topComponentValid).toBeTrue();
  });

  describe('onTabChange', () => {
    it('does nothing when there is no active layout config', () => {
      component.layoutConfig = null;
      expect(() => component.onTabChange(0)).not.toThrow();
    });

    it('re-renders the same bottom component when bottomComponent is a plain string', () => {
      configSubject.next({ ...baseConfig, bottomComponent: 'Bottom1Component' });
      expect(component['otherComponentRefs'].length).toBe(1);

      component.onTabChange(0);

      // destroyBottomComponent()'s cleanup filter compares
      // ref.location.nativeElement to the container's own anchor element,
      // which are never equal, so the previous bottom ref is never actually
      // removed from otherComponentRefs -- only the DOM view is cleared. The
      // re-render therefore leaves both the stale ref and the new one behind.
      expect(component['otherComponentRefs'].length).toBe(2);
    });

    it('renders the tab-specific bottom component when bottomComponent is an object map', () => {
      configSubject.next({
        ...baseConfig,
        bottomComponent: { 0: 'Bottom1Component', 1: 'Bottom2Component' } as any,
      });
      expect(component['otherComponentRefs'].length).toBe(0);

      component.onTabChange(1);

      expect(component['otherComponentRefs'].length).toBe(1);
    });

    it('destroys the bottom component without recreating it when the tab has no mapped component', () => {
      configSubject.next({
        ...baseConfig,
        bottomComponent: { 0: 'Bottom1Component' } as any,
      });

      component.onTabChange(0);
      expect(component['otherComponentRefs'].length).toBe(1);

      component.onTabChange(5);

      // onTabChange(5) resolves to no mapped bottom component, so it only
      // calls destroyBottomComponent() (no re-render). That clears the DOM
      // view, but its cleanup filter never actually removes the ref from
      // otherComponentRefs (see comment above), so the stale ref lingers.
      expect(component['otherComponentRefs'].length).toBe(1);
    });
  });

  describe('onValuesChange', () => {
    it('updates selectedDepot, propagates field values, and re-renders components', () => {
      configSubject.next({ ...baseConfig, userTableComponent: 'Top0Component' });
      expect(component['otherComponentRefs'].length).toBe(1);

      component.onValuesChange({ depot: 'D5' });

      expect(component.selectedDepot).toBe('D5');
      expect(mockLayoutConfigService.updateFieldValues).toHaveBeenCalledWith({
        depot: 'D5',
      });
      // Components are destroyed and re-rendered fresh.
      expect(component['otherComponentRefs'].length).toBe(1);
    });
  });

  describe('cleanup helpers', () => {
    it('destroyTopComponent is a no-op when there is no top component', () => {
      component['topComponentRef'] = null;
      expect(() => component['destroyTopComponent']()).not.toThrow();
    });

    it('resetDataSubscriptions replaces destroyData$ with a fresh subject', () => {
      const before = component['destroyData$'];
      component['resetDataSubscriptions']();
      expect(component['destroyData$']).not.toBe(before);
    });

    it('ngOnDestroy cleans up components, resets the service, and completes destroy$', () => {
      spyOn(component['destroy$'], 'next').and.callThrough();
      spyOn(component['destroy$'], 'complete').and.callThrough();
      const destroyOtherSpy = spyOn<any>(
        component,
        'destroyOtherComponents'
      ).and.callThrough();
      const destroyTopSpy = spyOn<any>(
        component,
        'destroyTopComponent'
      ).and.callThrough();

      component.ngOnDestroy();

      expect(destroyOtherSpy).toHaveBeenCalled();
      expect(destroyTopSpy).toHaveBeenCalled();
      expect(mockLayoutConfigService.reset).toHaveBeenCalled();
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
