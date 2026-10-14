import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { AppConfigService } from './services/app-config.service';

@Component({ template: '' })
class PageComponent {}

describe('AppComponent', () => {
  let router: Router;
  let title: Title;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'page', component: PageComponent, data: { title: 'Page Title' } },
          { path: 'untitled', component: PageComponent },
        ]),
        { provide: AppConfigService, useValue: { appMode: 'MDCS' } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    title = TestBed.inject(Title);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  function deepestRoute(): ActivatedRoute {
    let route = TestBed.inject(ActivatedRoute);
    while (route.firstChild) route = route.firstChild;
    return route;
  }

  it('sets the title from the route data', async () => {
    await router.navigateByUrl('/page');
    expect(title.getTitle()).toBe('Page Title');
  });

  it('falls back to the app mode when the route has no title', async () => {
    await router.navigateByUrl('/untitled');
    expect(title.getTitle()).toBe('MDCS');
  });

  it('keeps a single subscription to the active route data across navigations', async () => {
    await router.navigateByUrl('/page');
    // Same route, new query params: the ActivatedRoute is reused, so any
    // subscription left over from an earlier navigation would pile up here.
    for (let i = 0; i < 5; i++) {
      await router.navigateByUrl(`/page?i=${i}`);
    }

    const dataSubject = (deepestRoute() as any).dataSubject;
    expect(dataSubject.observers.length).toBe(1);
  });
});
