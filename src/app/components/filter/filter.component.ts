import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  DateAdapter,
  MatNativeDateModule,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDivider } from '@angular/material/divider';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { FilterService } from '@app/services/filter.service';
import { MatRadioModule } from '@angular/material/radio';
import { CONTROL_NAME_LABELS } from '@app/shared/utils/constants';
import {
  createFormGroup,
  getDateRangeValue,
  getSelectedDepotValues,
  getSelectedValuesFromFormArray,
  getSelectedValuesFromRadioGroup,
  IFilterConfig,
  isDateRangeControl,
} from '@app/shared/utils/form-utils';
import {
  DD_MM_YYYY_FORMAT,
  DdMmYyyyDateAdapter,
} from '@app/shared/utils/date-time';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-filter',
  imports: [
    MatFormFieldModule,
    MatButtonModule,
    MatRadioModule,
    MatIconModule,
    MatExpansionModule,
    MatMenuModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatInputModule,
    MatSelectModule,
    MatDivider,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: DateAdapter, useClass: DdMmYyyyDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild(MatMenuTrigger) menuTrigger: MatMenuTrigger;
  accordion = viewChild.required(MatAccordion);

  @Input() enableSearch: boolean = true;
  @Input() filterConfigs: IFilterConfig[] = [];
  @Input() placeholder: string = 'Search by keyword';

  filterForm: FormGroup;
  searchControl = new FormControl('');

  FILTER_NAMES: { [key: string]: string } = CONTROL_NAME_LABELS;

  // Deferred: Filter Component can still be optimized; final filter logic pending.
  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly filterService: FilterService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['filterConfigs'] &&
      changes['filterConfigs'].currentValue !==
        changes['filterConfigs'].previousValue
    ) {
      this.initializeForm();
    }
  }

  ngOnInit(): void {
    this.initializeForm();

    this.searchControl.valueChanges
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe(value => {
        // if (value)
        this.filterService.updateSearchValue(value);
      });

    // Subscribe to search value changes from service to sync the search control
    this.filterService.searchValue$.subscribe(value => {
      if (this.searchControl.value !== value) {
        this.searchControl.setValue(value || '', { emitEvent: false });
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.cdr.detach();
    this.filterService.updateSearchValue('');
    if (this.filterForm) {
      this.filterForm.reset();
    }
  }

  initializeForm(): void {
    this.filterForm = createFormGroup(this.filterConfigs);
    this.filterService.updateFormGroup(this.filterForm);
  }

  applyFilter() {
    this.accordion().closeAll();
    this.cdr.detectChanges();

    const appliedFilters = this.getAppliedFilters();
    this.updateFilterServices();
    this.filterService.updateSelectedFilters(appliedFilters);
    this.filterService.updateFilterConfigs(this.filterConfigs);

    this.filterService.updateFormGroup(this.filterForm);
    this.menuTrigger.closeMenu();
  }

  getAppliedFilters(): { [key: string]: string } {
    const filters: any = {};

    this.filterConfigs.forEach(({ controlName }) => {
      const result = this.resolveFilterBranch(controlName);

      switch (result.kind) {
        case 'depot':
        case 'formArray':
        case 'radio':
          filters[controlName] = result.displayValue;
          break;
        case 'dateRange':
          filters[controlName] = result.dateRange;
          break;
        case 'default':
          filters[controlName] = result.controlValue;
          break;
        default:
          break;
      }
    });

    return filters;
  }

  private updateFilterServices(): void {
    const batchedFilterValues: { [key: string]: any[] } = {};
    const dateRangeFilters: { controlName: string; dateRange: any }[] = [];

    this.filterConfigs.forEach(({ controlName }) => {
      const result = this.resolveFilterBranch(controlName);

      switch (result.kind) {
        case 'depot':
        case 'formArray':
          if (result.ids && result.ids.length > 0) {
            batchedFilterValues[controlName] = result.ids;
          }
          break;
        case 'dateRange':
          dateRangeFilters.push({ controlName, dateRange: result.dateRange });
          break;
        case 'radio':
          batchedFilterValues[controlName] = [result.radioId];
          break;
        case 'default':
          batchedFilterValues[controlName] = [result.controlValue];
          break;
        default:
          break;
      }
    });

    // Update all filter values in a single call to prevent multiple emissions
    if (Object.keys(batchedFilterValues).length > 0) {
      this.filterService.updateFilterValues(batchedFilterValues);
    }

    // Handle date range filters separately as they use a different method
    dateRangeFilters.forEach(({ controlName, dateRange }) => {
      this.filterService.updateDateRangeFilter(controlName, dateRange);
    });
  }

  /**
   * Classifies a filter control and computes its resolved value(s) once, so
   * both the display (getAppliedFilters) and batched-id (updateFilterServices)
   * paths can reuse the same branching logic without duplicating it.
   */
  private resolveFilterBranch(controlName: string): {
    kind: 'depot' | 'formArray' | 'dateRange' | 'radio' | 'default' | 'skip';
    displayValue?: string;
    ids?: string[];
    dateRange?: any;
    radioId?: string;
    controlValue?: any;
  } {
    const control = this.filterForm.get(controlName);
    if (!control?.value) {
      return { kind: 'skip' };
    }

    const configType = this.getConfigType(controlName);
    const configOptions = this.getConfigOptions(controlName);

    if (controlName.toLowerCase().includes('depot') && configType !== 'select') {
      const depotData = getSelectedDepotValues(
        this.filterForm,
        controlName,
        'depot_name',
        configOptions
      );
      return { kind: 'depot', displayValue: depotData.selectedValues, ids: depotData.selectedIds };
    }

    if (control instanceof FormArray && !controlName.toLowerCase().includes('depot')) {
      const formArrayValue = getSelectedValuesFromFormArray(
        this.filterForm,
        controlName,
        configOptions
      );
      return { kind: 'formArray', displayValue: formArrayValue.selectedValues, ids: formArrayValue.selectedIds };
    }

    if (isDateRangeControl(control)) {
      return this.resolveDateRangeBranch(control);
    }

    if (configType === 'radio') {
      const radioValue = getSelectedValuesFromRadioGroup(
        this.filterForm,
        controlName,
        configOptions
      );
      return { kind: 'radio', displayValue: radioValue.selectedValue, radioId: radioValue.selectedId };
    }

    const controlValue = control.value || null;
    return controlValue ? { kind: 'default', controlValue } : { kind: 'skip' };
  }

  private resolveDateRangeBranch(control: AbstractControl): {
    kind: 'dateRange' | 'skip';
    dateRange?: any;
  } {
    const dateRangeValue = getDateRangeValue(control);

    if (!dateRangeValue.startDate && !dateRangeValue.endDate) {
      return { kind: 'skip' };
    }
    // Auto-set endDate = startDate if only startDate is provided
    if (dateRangeValue.startDate && !dateRangeValue.endDate) {
      dateRangeValue.endDate = dateRangeValue.startDate;
    }
    // Auto-set startDate = endDate if only endDate is provided
    if (!dateRangeValue.startDate && dateRangeValue.endDate) {
      dateRangeValue.startDate = dateRangeValue.endDate;
    }
    return { kind: 'dateRange', dateRange: dateRangeValue };
  }

  private getConfigOptions(controlKey: string): any[] {
    const control = this.filterConfigs.find(
      config => config.controlName === controlKey
    );
    return control?.options ?? [];
  }

  private getConfigType(controlKey: string): string {
    const control = this.filterConfigs.find(
      config => config.controlName === controlKey
    );

    return control?.type ?? '';
  }

  clearFilter() {
    this.filterService.clearSelectedFilters();
    this.accordion().closeAll();
    this.cdr.detectChanges();

    this.menuTrigger.closeMenu();
  }

  /**
   * Get display label for option based on control type
   * currDepot uses depot_name, others use value
   */
  getOptionDisplayLabel(controlName: string, option: any): string {
    let displayLabel = '';
    if (controlName === 'currDepot') {
      displayLabel = option.depot_name || option.value || '';
      // console.log(`currDepot display label:`, {
      //   controlName,
      //   option,
      //   displayLabel,
      //   usingField: 'depot_name',
      // });
    } else {
      displayLabel = option.value || '';
      // console.log(`${controlName} display label:`, {
      //   controlName,
      //   option,
      //   displayLabel,
      //   usingField: 'value',
      // });
    }
    return displayLabel;
  }

  /**
   * Get option value for form control based on control type
   * currDepot uses depot_id, others use value or id
   */
  getOptionValue(controlName: string, option: any): any {
    let optionValue;
    if (controlName === 'currDepot') {
      optionValue = option.depot_id || option.id;
      // console.log(`currDepot option value:`, {
      //   controlName,
      //   option,
      //   optionValue,
      //   usingField: 'depot_id',
      // });
    } else {
      optionValue = option.value || option.id;
      // console.log(`${controlName} option value:`, {
      //   controlName,
      //   option,
      //   optionValue,
      //   usingField: 'value or id',
      // });
    }
    return optionValue;
  }

  onDateInputKeydown(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      if (['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
        return;
      }
    }

    if (!/[0-9/]/.test(event.key)) {
      event.preventDefault();
    }
  }

  onDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formattedValue = this.formatDateInputValue(input.value);
    const control = this.filterForm.get(
      input.getAttribute('formControlName') || ''
    );

    if (formattedValue !== input.value) {
      input.value = formattedValue;
    }

    if (control) {
      control.setValue(this.parseDateInputValue(formattedValue), {
        emitEvent: false,
      });
    }
  }

  onDateRangeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formattedValue = this.formatDateInputValue(input.value);
    const formGroupName = input
      .closest('[formGroupName]')
      ?.getAttribute('formGroupName');
    const controlName = input.getAttribute('formControlName');

    if (formattedValue !== input.value) {
      input.value = formattedValue;
    }

    if (formGroupName && controlName) {
      const formGroup = this.filterForm.get(formGroupName);
      const control = formGroup?.get(controlName);

      if (control) {
        control.setValue(this.parseDateInputValue(formattedValue), {
          emitEvent: false,
        });
      }
    }
  }

  private formatDateInputValue(value: string): string {
    const digitsOnly = value.replace(/\D/g, '').substring(0, 8);
    let formattedValue = '';

    for (let index = 0; index < digitsOnly.length; index++) {
      if (index === 2 || index === 4) {
        formattedValue += '/';
      }

      formattedValue += digitsOnly[index];
    }

    return formattedValue;
  }

  private parseDateInputValue(value: string): Date | null {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return null;
    }

    const [dayString, monthString, yearString] = value.split('/');
    const day = Number(dayString);
    const month = Number(monthString);
    const year = Number(yearString);
    const parsedDate = new Date(year, month - 1, day);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getDate() !== day ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getFullYear() !== year
    ) {
      return null;
    }

    return parsedDate;
  }
}
