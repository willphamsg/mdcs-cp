import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReleaseClosedMenuPanelDirective } from './release-closed-menu-panel.directive';

@Component({
  imports: [MatMenuModule, ReleaseClosedMenuPanelDirective],
  template: `
    <button type="button" [matMenuTriggerFor]="menu">Open</button>
    <mat-menu #menu="matMenu" appReleaseClosedPanel>
      <ng-template matMenuContent>
        <button type="button" mat-menu-item class="item">One</button>
        <button type="button" mat-menu-item class="item">Two</button>
      </ng-template>
    </mat-menu>
  `,
})
class HostComponent {
  readonly trigger = viewChild.required(MatMenuTrigger);
}

describe('ReleaseClosedMenuPanelDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach(el => (el.innerHTML = ''));
  });

  function open(): HTMLElement {
    fixture.componentInstance.trigger().openMenu();
    fixture.detectChanges();
    tick();
    const panel = document.querySelector<HTMLElement>('.mat-mdc-menu-panel');
    expect(panel).withContext('menu panel should be open').toBeTruthy();
    return panel!;
  }

  function close(): void {
    fixture.componentInstance.trigger().closeMenu();
    fixture.detectChanges();
    flush();
  }

  it('moves the host-owned nodes out of the dead panel once it has left the page', fakeAsync(() => {
    const panel = open();
    const content = panel.querySelector('.mat-mdc-menu-content')!;
    expect(content.querySelectorAll('.item')).toHaveSize(2);

    close();

    expect(panel.isConnected).toBeFalse();
    // Nothing the host view still owns may be left inside the closed panel,
    // or that panel (and every listener on it) can never be collected.
    expect(content.childNodes).toHaveSize(0);
  }));

  it('still renders the items when the menu is reopened', fakeAsync(() => {
    open();
    close();

    const panel = open();

    expect(panel.querySelectorAll('.item')).toHaveSize(2);
    close();
  }));

  it('clears the active item on close', fakeAsync(() => {
    open();
    const menu = fixture.componentInstance.trigger().menu!;
    const reset = spyOn(menu, 'resetActiveItem').and.callThrough();

    close();

    expect(reset).toHaveBeenCalled();
  }));

  it('stops waiting for the panel once the host is destroyed', fakeAsync(() => {
    open();
    fixture.componentInstance.trigger().closeMenu();
    fixture.detectChanges();

    fixture.destroy();

    expect(() => flush()).not.toThrow();
  }));
});
