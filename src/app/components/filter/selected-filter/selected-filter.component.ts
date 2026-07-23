import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { FilterService } from '@app/services/filter.service';
import { CONTROL_NAME_LABELS } from '@app/shared/utils/constants';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-selected-filter',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    MatChipsModule,
    MatIconModule,
  ],
  templateUrl: './selected-filter.component.html',
  styleUrl: './selected-filter.component.scss',
})
export class SelectedFilterComponent implements OnInit, OnDestroy {
  selectedFilters: Observable<{ [key: string]: any }>;
  filterConfigs: Observable<IFilterConfig[]>;
  FILTER_NAMES: { [key: string]: string } = CONTROL_NAME_LABELS;

  constructor(private readonly filterService: FilterService) {}

  ngOnInit(): void {
    this.selectedFilters = this.filterService.selectedFilters$;
    this.filterConfigs = this.filterService.filterConfigs$;
  }

  ngOnDestroy(): void {
    this.filterService.clearSelectedFilters();
  }

  isFilterNotEmpty(filterKey: string): Observable<boolean> {
    return this.filterService.selectedFilters$.pipe(
      map(filters => {
        const value: any = filters[filterKey];

        if (
          filterKey === 'effectiveDate' ||
          filterKey === 'effectiveDateLive' ||
          filterKey === 'effectiveDateTrial' ||
          filterKey === 'dateRange' ||
          filterKey === 'eventDateTime'
        ) {
          return value?.startDate != null && value?.endDate != null;
        }
        return value !== '' && value != null;
      })
    );
  }

  isDateRangeFilter(filterKey: string): Observable<boolean> {
    return this.filterService.selectedFilters$.pipe(
      map(filters => {
        const value: any = filters[filterKey];

        return (
          (filterKey === 'effectiveDate' ||
            filterKey === 'effectiveDateLive' ||
            filterKey === 'effectiveDateTrial' ||
            filterKey === 'dateRange' ||
            filterKey === 'eventDateTime') &&
          value &&
          typeof value === 'object' &&
          value.startDate != null &&
          value.endDate != null
        );
      })
    );
  }

  removeFilter(controlName: string): void {
    const currentFilters = this.filterService.getSelectedFilters();
    const updatedFilters = { ...currentFilters };
    updatedFilters[controlName] = '';

    this.filterService.removeFilter(controlName, updatedFilters);
    this.filterService.updateFilterValues({ [controlName]: [] });
  }
}
