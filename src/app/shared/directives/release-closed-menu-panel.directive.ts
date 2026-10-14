import { DestroyRef, Directive, TemplateRef, contentChild, inject } from '@angular/core';
import { MatMenu, MatMenuContent } from '@angular/material/menu';

const RELEASE_POLL_MS = 100;
const RELEASE_MAX_POLLS = 20;

/**
 * Lets a closed, lazily rendered `mat-menu` panel be garbage-collected.
 *
 * Angular never removes `animation*`/`transition*` listeners from the elements
 * of a destroyed view - it relies on those elements being collected - and a
 * closed menu panel can't be collected while anything the host view still
 * owns sits inside it. Two such nodes are left behind in every closed panel:
 * the `<ng-template matMenuContent>` anchor, which is content-projected into
 * it, and the outlet `<div>` MatMenuContent inserts beside that anchor. A
 * menu in a long-lived component (header, footer) therefore pins its last
 * dead panel, its DOM and its listeners until it is opened again. Once the
 * panel has actually left the page, move those two nodes out of it; the next
 * open projects and re-inserts them into the new panel as usual.
 *
 * Also drops the key manager's reference to the last active item, which
 * otherwise keeps that item's destroyed view (and its DOM) alive the same way.
 */
@Directive({
  selector: 'mat-menu[appReleaseClosedPanel]',
  standalone: true,
})
export class ReleaseClosedMenuPanelDirective {
  private readonly menu = inject(MatMenu);
  private readonly lazyContent = contentChild(MatMenuContent, { read: TemplateRef });
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const subscription = this.menu.closed.subscribe(() => {
      this.menu.resetActiveItem();
      this.releaseOnceDetached(0);
    });
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      clearTimeout(this.timer);
    });
  }

  // The panel only leaves the DOM after its exit animation (Material falls
  // back to 200ms if no animationend arrives), so wait for that rather than
  // pulling content out of a panel that is still fading.
  private releaseOnceDetached(polls: number): void {
    clearTimeout(this.timer);
    const anchor = this.lazyContent()?.elementRef.nativeElement as Node | undefined;
    if (!anchor?.parentNode) {
      return;
    }
    if (anchor.isConnected) {
      // Still on screen: mid-animation, or reopened in the meantime (in which
      // case it is simply left alone once the polls run out).
      if (polls < RELEASE_MAX_POLLS) {
        this.timer = setTimeout(() => this.releaseOnceDetached(polls + 1), RELEASE_POLL_MS);
      }
      return;
    }
    const outlet = anchor.previousSibling;
    if (outlet instanceof HTMLElement && outlet.childNodes.length === 0) {
      outlet.remove();
    }
    anchor.parentNode.removeChild(anchor);
  }
}
