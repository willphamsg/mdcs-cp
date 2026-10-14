import { Component, OnInit } from '@angular/core';

import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from './services/app-config.service';
import { filter, map, switchMap } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  constructor(
    private readonly titleService: Title,
    private readonly configService: AppConfigService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map(route => {
          while (route.firstChild) route = route.firstChild;
          return route;
        }),
        // switchMap, not mergeMap: each navigation must drop the previous
        // route's data subscription, or every NavigationEnd adds another
        // observer (and root-subscriber finalizer) that lives for the session.
        switchMap(route => route.data)
      )
      .subscribe(data => {
        const appMode = this.configService.appMode?.toLowerCase();
        let title = 'Loading...';
        if (appMode === 'dagw') {
          title = 'DAGW';
        } else if (appMode === 'mdcs') {
          title = 'MDCS';
        }
        const routeTitle = data['title'] ?? title;
        this.titleService.setTitle(`${routeTitle}`);
      });
  }
}
