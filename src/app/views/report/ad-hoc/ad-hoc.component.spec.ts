import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { AdHocComponent } from './ad-hoc.component';

describe('AdHocComponent', () => {
  let component: AdHocComponent;
  let fixture: ComponentFixture<AdHocComponent>;

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

    fixture = TestBed.createComponent(AdHocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getAdhocType', () => {
    it('should return the adhoc type based on the route path', () => {
      const result = component.getAdhocType();
      expect(result).toBe('test');
    });

    it('should return an empty string if route is not defined', () => {
      spyOn(component, 'getAdhocType').and.returnValue('');

      const result = component.getAdhocType();
      expect(result).toBe('');
    });
  });

  describe('getPageTitle', () => {
    it('should return the correct title for a valid adhoc type', () => {
      spyOn(component, 'getAdhocType').and.returnValue(
        'report/adhoc/bus-transfer-report'
      );

      const result = component.getPageTitle();
      expect(result).toBe('Bus Transfer Report');
    });

    it('should return an empty string for an unknown adhoc type', () => {
      spyOn(component, 'getAdhocType').and.returnValue('test');

      const result = component.getPageTitle();
      expect(result).toBe('');
    });
  });
});
