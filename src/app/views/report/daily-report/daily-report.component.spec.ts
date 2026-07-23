import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute } from '@angular/router';
import { BreadcrumbsComponent } from '@app/components/layout/breadcrumbs/breadcrumbs.component';
import { DailyReportComponent } from './daily-report.component';

describe('DailyReportComponent', () => {
  let component: DailyReportComponent;
  let fixture: ComponentFixture<DailyReportComponent>;

  const mockActivatedRoute = {
    snapshot: {
      firstChild: {
        routeConfig: {
          path: 'test',
        },
      },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatTableModule,
        MatCardModule,
        MatToolbarModule,
        MatTabsModule,
        MatMenuModule,
        MatDividerModule,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        MatButtonModule,
        CommonModule,
        ReactiveFormsModule,
        MatInputModule,
        BreadcrumbsComponent,
      ],
      providers: [{ provide: ActivatedRoute, useValue: mockActivatedRoute }],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getAdhocType', () => {
    it('should return the report type based on the route path', () => {
      const result = component.getReportType();
      expect(result).toBe('test');
    });

    it('should return an empty string if route is not defined', () => {
      spyOn(component, 'getReportType').and.returnValue('');

      const result = component.getReportType();
      expect(result).toBe('');
    });
  });

  describe('getPageTitle', () => {
    it('should return the correct title for a valid report type', () => {
      spyOn(component, 'getReportType').and.returnValue(
        'report/daily-report/all-daily-report'
      );

      const result = component.getPageTitle();
      expect(result).toBe('All Daily Report');
    });

    it('should return an empty string for an unknown report type', () => {
      spyOn(component, 'getReportType').and.returnValue('test');

      const result = component.getPageTitle();
      expect(result).toBe('');
    });
  });
});
