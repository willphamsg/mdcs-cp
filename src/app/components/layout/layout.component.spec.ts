import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LayoutComponent } from './layout.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { showSnackbar } from '@store/snackbar/snackbar.actions';
import { InactivityTimeoutService } from '@app/services/inactivity-timeout.service';

// Create stub components because Header/Footer load complex dependencies
import { Component } from '@angular/core';
@Component({ selector: 'app-header', standalone: true, template: '' })
class StubHeaderComponent {}
@Component({ selector: 'app-footer', standalone: true, template: '' })
class StubFooterComponent {}

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;
  let store: MockStore;

  beforeEach(async () => {
    const inactivityTimeoutServiceSpy = jasmine.createSpyObj('InactivityTimeoutService', ['start', 'stop']);

    await TestBed.configureTestingModule({
      imports: [LayoutComponent, MatSnackBarModule, RouterTestingModule],
      providers: [
        provideMockStore({ initialState: { snackbar: { show: false } } }),
        { provide: InactivityTimeoutService, useValue: inactivityTimeoutServiceSpy }
      ]
    })
    .overrideComponent(LayoutComponent, {
      remove: { imports: [HeaderComponent, FooterComponent] },
      add: { imports: [StubHeaderComponent, StubFooterComponent] }
    })
    .compileComponents();
    
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open snackbar with string message', () => {
    spyOn(store, 'dispatch');
    component.openSnackBar(false);
    expect(store.dispatch).toHaveBeenCalledWith(
      showSnackbar({
        message: 'sample message',
        title: 'sample title',
        typeSnackbar: 'success',
      })
    );
  });

  it('should open snackbar with array message', () => {
    spyOn(store, 'dispatch');
    component.openSnackBar(true);
    expect(store.dispatch).toHaveBeenCalledWith(
      showSnackbar({
        message: jasmine.any(Array) as any,
        title: 'sample title',
        typeSnackbar: 'error',
      })
    );
  });

});
