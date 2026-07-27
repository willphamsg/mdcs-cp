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
import {
  IActionHistoryParams,
  IParams,
  PayloadResponse,
} from '@models/common';
import { IEndTrial } from '@models/parameter-trial';

import { MatDividerModule } from '@angular/material/divider';
import { FilterComponent } from '@app/components/filter/filter.component';
import { MonthFilterComponent } from '@app/components/filter/month-filter/month-filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import EndTrialHeader from '@data/end-trial-header.json';
import { Observable } from 'rxjs';
import { ViewComponent } from '../view/view.component';
import { generateUniqueNumberId } from '@app/shared/utils/utils';
import { ParameterTrialSearchBase } from '../../shared/parameter-trial-search.base';

@Component({
  selector: 'app-end-trial-search',
  templateUrl: './end-trial-search.component.html',
  styleUrls: ['./end-trial-search.component.scss'],
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
export class EndTrialSearchComponent extends ParameterTrialSearchBase<IEndTrial> {
  protected readonly viewDialogComponent = ViewComponent;
  protected readonly listPayloadKey = 'end_trial_list';
  protected readonly errorItemLabel = 'end trial';
  protected readonly errorSnackbarTitle = 'End Trial Error';
  protected readonly defaultStatus = [7];
  protected readonly inProgressStatusCodes = new Set([
    'APPROVE_TO_LIVE',
    'TRIAL_TO_LIVE',
    'TRIAL_TO_REJECTED',
    'APPROVE_TO_TRIAL',
  ]);

  headerData = EndTrialHeader;

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id: [],
      status: [7],
      svc_prov_id: [],
      effective_date_from: '',
      effective_date_till: '',
    },
  };

  actionHistoryParams: IActionHistoryParams = {
    search_select_filter: {
      status: [7],
      last_updated_start: this.initDefaultMonth().effective_date_from,
      last_updated_end: this.initDefaultMonth().effective_date_till,
    },
    search_text: null,
    sort_order: [{ name: 'last_update', desc: true }],
  };

  // Error check parameters for End Trial
  errorCheckParams: IActionHistoryParams = {
    search_select_filter: {
      status: [8, 11],
    },
  };

  protected getSelectionObservable(): Observable<IEndTrial[]> {
    return this.selectionService.endTrialSelection$;
  }

  protected addSelection(item: IEndTrial): void {
    this.selectionService.addEndTrialSelection(item);
  }

  protected removeSelection(id: string | number): void {
    this.selectionService.removeEndTrialSelection(id);
  }

  protected isSelected(id: string | number): boolean {
    return this.selectionService.isEndTrialSelected(id);
  }

  protected getSelections(): IEndTrial[] {
    return this.selectionService.getEndTrialSelections();
  }

  protected clearSelections(): void {
    this.selectionService.clearEndTrialSelections();
  }

  protected addMultipleSelections(items: IEndTrial[]): void {
    this.selectionService.addMultipleEndTrialSelections(items);
  }

  protected removeMultipleSelections(ids: string[]): void {
    this.selectionService.removeMultipleEndTrialSelections(ids);
  }

  protected searchActionErrors(
    params: IActionHistoryParams
  ): Observable<PayloadResponse> {
    return this.parameterService.searchEndTrialErrors(params);
  }

  mapDataSource(item: any): IEndTrial {
    const depot = this.depots.find(_d => _d.depot_id === item.depot_id);
    const strDepotId = item.depot_id.toString();

    // Use stable ID: param_master_id + depot_id combination for selection persistence
    const stableId =
      item.param_master_id && item.depot_id
        ? `${item.param_master_id}_${item.depot_id}`
        : generateUniqueNumberId();

    return <IEndTrial>{
      ...item,
      id: stableId,
      chk: false,
      svc_prov_id: Number.parseInt(this.svcProviderID!, 10),
      depot_name: strDepotId === '0' ? 'All Depot' : depot?.depot_name,
      param_master_id: item.param_master_id,
    };
  }

  protected getUpdateViewTitle(action: string): string {
    if (action === 'trial-to-live') {
      return 'Accept';
    }
    if (action === 'reject-trial') {
      return 'Reject';
    }
    return '';
  }

  updateView(action: string): void {
    const allSelectedItems = this.getSelections();
    const paramMasterIds = this.extractParamMasterIds(allSelectedItems);
    this.openParameterTrialDialog(
      action,
      allSelectedItems,
      paramMasterIds,
      ['trial-to-live', 'reject-trial'],
      ['cancel']
    );
  }

  /**
   * Get the display status for action history
   * Maps status_desc to correct display value:
   * - status_code 8 or "LIVE" -> "Live" (green)
   * - status_code 11 or "REJECTED" -> "Rejected" (red)
   * - "TRIAL" in action history should show as "Live" (items converted from trial to live)
   */
  getDisplayStatus(element: IEndTrial): string {
    // Priority 1: Use status_code if available (most reliable)
    if (element.status_code === 8) {
      return 'Live';
    } else if (element.status_code === 11) {
      return 'Rejected';
    }

    // Priority 2: Map status_desc
    const statusDesc = element.status_desc?.toUpperCase() || '';

    // In action history, items that were converted from trial to live should show as "Live"
    if (statusDesc === 'LIVE' || statusDesc === 'TRIAL') {
      return 'Live';
    } else if (statusDesc === 'REJECTED') {
      return 'Rejected';
    }

    // Default: return the status_desc as-is (will be titlecased in template)
    return element.status_desc || '';
  }

  /**
   * Get the CSS class for status display
   */
  getStatusClass(element: IEndTrial): string {
    const displayStatus = this.getDisplayStatus(element);
    const statusLower = displayStatus.toLowerCase();

    if (statusLower === 'live') {
      return 'live';
    } else if (statusLower === 'rejected') {
      return 'rejected';
    } else if (this.isInProgressStatus(element.status_desc)) {
      return 'in-progress';
    }

    return statusLower;
  }
}
