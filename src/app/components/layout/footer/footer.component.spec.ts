import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { DepoService } from '@app/services/depo.service';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { PLATFORM_ID } from '@angular/core';
import { of } from 'rxjs';
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
});
