import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { IMessage } from '@app/models/message';
import { PaginationService } from '@app/services/pagination.service';
import { Observable, of } from 'rxjs';
import { BreadcrumbsComponent } from '../layout/breadcrumbs/breadcrumbs.component';
import { PaginationComponent } from '../pagination/pagination.component';

@Component({
    selector: 'app-data-list',
    imports: [
        BreadcrumbsComponent,
        MatCardModule,
        MatDividerModule,
        MatIconModule,
        PaginationComponent,
        CommonModule,
    ],
    templateUrl: './data-list.component.html',
    styleUrl: './data-list.component.scss'
})
export class DataListComponent implements OnInit {
  @Input() headerName: string;
  @Input() list: IMessage[] = [];

  paginatedList$: Observable<any[]> = of([]);

  constructor(private paginationService: PaginationService) {}

  ngOnInit(): void {}
}
