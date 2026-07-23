import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.scss'],
})
export class BreadcrumbsComponent {
  @Input() showHome: boolean = true;
  @Input() menuItem: string | string[];
  @Input() headerTitle: string;

  get isMenuArray(): boolean {
    return Array.isArray(this.menuItem);
  }
}
