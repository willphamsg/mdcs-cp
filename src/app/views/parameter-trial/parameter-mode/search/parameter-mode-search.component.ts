import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { RouterModule } from '@angular/router';
import { IActionHistoryParams, IParams, PayloadResponse } from '@models/common';
import {
  IParameterMode,
  IValidatedParameterStatus,
  IValidateLiveRequest,
  TUserActionType,
} from '@models/parameter-trial';

import { MatDividerModule } from '@angular/material/divider';
import { FilterComponent } from '@app/components/filter/filter.component';
import { MonthFilterComponent } from '@app/components/filter/month-filter/month-filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import ParameterModeHeader from '@data/parameter-mode-header.json';
import { Observable } from 'rxjs';
import { ViewComponent } from '../view/view.component';
import { generateUniqueNumberId } from '@app/shared/utils/utils';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { ParameterTrialSearchBase } from '../../shared/parameter-trial-search.base';

@Component({
  selector: 'app-parameter-mode-search',
  templateUrl: './parameter-mode-search.component.html',
  styleUrls: ['./parameter-mode-search.component.scss'],
  providers: [DatePipe],
  imports: [
    BreadcrumbsComponent,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    RouterModule,
    MatCheckboxModule,
    MatSortModule,
    CommonModule,
    MatDividerModule,
    FormsModule,
    FilterComponent,
    PaginationComponent,
    SelectedFilterComponent,
    MonthFilterComponent,
  ],
})
export class ParameterModeSearchComponent extends ParameterTrialSearchBase<IParameterMode> {
  protected readonly viewDialogComponent = ViewComponent;
  protected readonly listPayloadKey = 'parameter_mode_list';
  protected readonly errorItemLabel = 'parameter mode';
  protected readonly errorSnackbarTitle = 'Parameter Mode Error';
  protected readonly defaultStatus = [4];
  protected readonly inProgressStatusCodes = new Set([
    'APPROVE_TO_LIVE',
    'TRIAL_TO_LIVE',
    'TRIAL_TO_REJECTED',
    'APPROVE_TO_TRIAL',
  ]);

  headerData = ParameterModeHeader;

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id: [],
      status: [0],
      svc_prov_id: [],
      effective_date_from: '',
      effective_date_till: '',
    },
  };

  actionHistoryParams: IActionHistoryParams = {
    search_select_filter: {
      status: [4],
      last_updated_start: this.initDefaultMonth().effective_date_from,
      last_updated_end: this.initDefaultMonth().effective_date_till,
    },
    search_text: null,
    sort_order: [{ name: 'last_update', desc: true }],
  };

  // Error check parameters for Parameter Mode
  errorCheckParams: IActionHistoryParams = {
    search_select_filter: {
      status: [5, 6],
    },
  };

  protected getSelectionObservable(): Observable<IParameterMode[]> {
    return this.selectionService.parameterModeSelection$;
  }

  protected addSelection(item: IParameterMode): void {
    this.selectionService.addParameterModeSelection(item);
  }

  protected removeSelection(id: string | number): void {
    this.selectionService.removeParameterModeSelection(id);
  }

  protected isSelected(id: string | number): boolean {
    return this.selectionService.isParameterModeSelected(id);
  }

  protected getSelections(): IParameterMode[] {
    return this.selectionService.getParameterModeSelections();
  }

  protected clearSelections(): void {
    this.selectionService.clearParameterModeSelections();
  }

  protected addMultipleSelections(items: IParameterMode[]): void {
    this.selectionService.addMultipleParameterModeSelections(items);
  }

  protected removeMultipleSelections(ids: string[]): void {
    this.selectionService.removeMultipleParameterModeSelections(ids);
  }

  protected searchActionErrors(
    params: IActionHistoryParams
  ): Observable<PayloadResponse> {
    return this.parameterService.searchParameterModeErrors(params);
  }

  mapDataSource(item: any): IParameterMode {
    const depot = this.depots.find(_d => _d.depot_id === item.depot_id);
    const strDepotId = item.depot_id.toString();

    // Use stable ID: param_master_id + depot_id combination for selection persistence
    const stableId =
      item.param_master_id && item.depot_id
        ? `${item.param_master_id}_${item.depot_id}`
        : generateUniqueNumberId();

    return <IParameterMode>{
      ...item,
      id: stableId,
      chk: false,
      svc_prov_id: Number.parseInt(this.svcProviderID!, 10),
      depot_name: strDepotId === '0' ? 'All Depot' : depot?.depot_name,
      param_master_id: item.param_master_id,
    };
  }

  protected getUpdateViewTitle(action: string): string {
    if (action === 'live') {
      return 'Live';
    }
    if (action === 'trial') {
      return 'Trial';
    }
    return '';
  }

  updateView(action: string): void {
    const allSelectedItems = this.getSelections();
    if (!allSelectedItems.length) {
      this.showSnackbarNotification(
        'Select at least one parameter before continuing.',
        'Set Parameter Action',
        'warning'
      );
      return;
    }
    const paramMasterIds = this.extractParamMasterIds(allSelectedItems);

    if (action === 'live') {
      this.validateSelectionsForLive(allSelectedItems, paramMasterIds);
      return;
    }

    if (action === 'trial') {
      this.validateSelectionsForTrial(allSelectedItems, paramMasterIds);
      return;
    }

    this.openViewDialog(action, allSelectedItems, paramMasterIds);
  }

  private validateSelectionsForLive(
    selections: IParameterMode[],
    paramMasterIds: number[]
  ): void {
    const payload = this.buildValidationPayload(selections);

    if (!payload.length) {
      this.showSnackbarNotification(
        'Unable to validate Set Live request. Missing parameter identifiers.',
        'Set Live',
        'error'
      );
      return;
    }

    this.parameterService.validateLive(payload).subscribe({
      next: value => {
        if (value.status === 200) {
          const validatedStatuses: IValidatedParameterStatus[] =
            value.payload?.['validated_parameter_status'] ?? [];
          const mergedSelection = this.mergeValidatedStatuses(
            validatedStatuses,
            selections
          );
          const userActionType = this.extractUserActionType(validatedStatuses);

          this.openViewDialog('live', mergedSelection, paramMasterIds, {
            remark: value.message,
            userActionType,
          });
        } else {
          this.showSnackbarNotification(
            value.message ||
              'Validation failed. Please try again before setting live.',
            'Set Live',
            'error'
          );
        }
      },
      error: error => {
        console.error('Failed to validate Set Live request:', error);
        this.showSnackbarNotification(
          'Unable to validate Set Live request. Please retry.',
          'Set Live',
          'error'
        );
      },
    });
  }

  private validateSelectionsForTrial(
    selections: IParameterMode[],
    paramMasterIds: number[]
  ): void {
    const payload = this.buildValidationPayload(selections);

    if (!payload.length) {
      this.showSnackbarNotification(
        'Unable to validate Set Trial request. Missing parameter identifiers.',
        'Set Trial',
        'error'
      );
      return;
    }

    this.parameterService.validateTrial(payload).subscribe({
      next: value => {
        if (value.status === 200) {
          const validatedStatuses: IValidatedParameterStatus[] =
            value.payload?.['validated_parameter_status'] ?? [];
          const mergedSelection = this.mergeValidatedStatuses(
            validatedStatuses,
            selections
          );
          const userActionType = this.extractUserActionType(validatedStatuses);

          this.openViewDialog('trial', mergedSelection, paramMasterIds, {
            remark: value.message,
            userActionType,
          });
        } else {
          this.showSnackbarNotification(
            value.message ||
              'Validation failed. Please try again before setting trial.',
            'Set Trial',
            'error'
          );
        }
      },
      error: error => {
        console.error('Failed to validate Set Trial request:', error);
        this.showSnackbarNotification(
          'Unable to validate Set Trial request. Please retry.',
          'Set Trial',
          'error'
        );
      },
    });
  }

  private buildValidationPayload(
    selections: IParameterMode[]
  ): IValidateLiveRequest[] {
    return selections
      .filter(
        item =>
          typeof item.param_master_id === 'number' &&
          item.param_master_id !== undefined &&
          item.depot_id !== undefined &&
          !Number.isNaN(Number(item.depot_id))
      )
      .map(item => ({
        param_master_id: item.param_master_id as number,
        depot_id: Number(item.depot_id),
        parameter_name: item.parameter_name,
        parameter_version: item.parameter_version,
        effective_date_time: item.effective_date_time,
      }));
  }

  private mergeValidatedStatuses(
    validatedStatuses: IValidatedParameterStatus[],
    originalSelections: IParameterMode[]
  ): IParameterMode[] {
    if (!validatedStatuses?.length) {
      return originalSelections;
    }

    const selectionMap = new Map<number, IParameterMode>();
    originalSelections.forEach(item => {
      if (typeof item.param_master_id === 'number') {
        selectionMap.set(item.param_master_id, item);
      }
    });

    const handledIds = new Set<number>();

    const merged = validatedStatuses.map(validatedItem => {
      const paramMasterId = validatedItem.parameter_status?.param_master_id;
      const source =
        typeof paramMasterId === 'number'
          ? selectionMap.get(paramMasterId)
          : undefined;

      const validatedDepotId =
        validatedItem.parameter_status?.depot_id !== undefined
          ? Number(validatedItem.parameter_status?.depot_id)
          : undefined;

      const depot = this.depots.find(depotItem => {
        const depotIdNumber = Number(depotItem.depot_id);
        if (
          validatedDepotId !== undefined &&
          !Number.isNaN(validatedDepotId) &&
          !Number.isNaN(depotIdNumber)
        ) {
          return depotIdNumber === validatedDepotId;
        }
        return (
          String(depotItem.depot_id) ===
          String(validatedItem.parameter_status?.depot_id)
        );
      });

      const resolvedDepotId =
        validatedItem.parameter_status?.depot_id ??
        source?.depot_id ??
        depot?.depot_id ??
        '';
      const resolvedDepotName =
        depot?.depot_name ?? source?.depot_name ?? 'Unknown Depot';
      const resolvedParameterName =
        validatedItem.parameter_status?.parameter_name ??
        source?.parameter_name ??
        '';
      const resolvedParameterVersion =
        validatedItem.parameter_status?.parameter_version ??
        source?.parameter_version ??
        '';
      const resolvedEffectiveDate =
        validatedItem.parameter_status?.effective_date_time ??
        source?.effective_date_time;
      const resolvedParamMasterId =
        paramMasterId ?? source?.param_master_id ?? undefined;

      const baseItem: IParameterMode = {
        ...(source ?? {
          chk: false,
          id: generateUniqueNumberId(),
          version: 0,
        }),
        depot_id: resolvedDepotId,
        depot_name: resolvedDepotName,
        parameter_name: resolvedParameterName,
        parameter_version: resolvedParameterVersion,
        effective_date_time: resolvedEffectiveDate,
        param_master_id: resolvedParamMasterId,
        svc_prov_id: source?.svc_prov_id,
        scenario_details: validatedItem.scenario_details,
      };
      if (typeof paramMasterId === 'number') {
        handledIds.add(paramMasterId);
      }
      return baseItem;
    });

    const unvalidatedSelections = originalSelections.filter(item => {
      if (typeof item.param_master_id !== 'number') {
        return true;
      }
      return !handledIds.has(item.param_master_id);
    });

    return [...merged, ...unvalidatedSelections];
  }

  private extractUserActionType(
    validatedStatuses: IValidatedParameterStatus[]
  ): TUserActionType {
    const actionType = validatedStatuses?.find(
      status => status.scenario_details?.user_action_type
    )?.scenario_details?.user_action_type;
    return (actionType as TUserActionType) || 'NONE';
  }

  private openViewDialog(
    action: string,
    selection: IParameterMode[],
    paramMasterIds: number[],
    options?: {
      remark?: string;
      userActionType?: TUserActionType;
    }
  ): void {
    this.openParameterTrialDialog(
      action,
      selection,
      paramMasterIds,
      ['live', 'trial'],
      ['cancel', 'no', 'ok'],
      {
        remark: options?.remark,
        userActionType: options?.userActionType ?? 'NONE',
      }
    );
  }

  private showSnackbarNotification(
    message: string,
    title: string,
    typeSnackbar: string = 'info'
  ): void {
    this.store.dispatch(
      showSnackbar({
        message,
        title,
        typeSnackbar,
      })
    );
  }
}
