import { Component, OnInit } from '@angular/core';

import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from './services/app-config.service';
import { filter, map, mergeMap } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  constructor(
    private titleService: Title,
    private configService: AppConfigService,
    private router: Router,
    private activatedRoute: ActivatedRoute
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
        mergeMap(route => route.data)
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
