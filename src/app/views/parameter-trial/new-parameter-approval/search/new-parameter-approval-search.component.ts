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
import { INewParameterApproval } from '@models/parameter-trial';

import { MatDividerModule } from '@angular/material/divider';
import { FilterComponent } from '@app/components/filter/filter.component';
import { MonthFilterComponent } from '@app/components/filter/month-filter/month-filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import NewParameterApprovalHeader from '@data/new-parameter-approval-header.json';
import { Observable } from 'rxjs';
import { ViewComponent } from '../view/view.component';
import { generateUniqueNumberId } from '@app/shared/utils/utils';
import { ParameterTrialSearchBase } from '../../shared/parameter-trial-search.base';

@Component({
  selector: 'app-new-parameter-approval-search',
  templateUrl: './new-parameter-approval-search.component.html',
  styleUrls: ['./new-parameter-approval-search.component.scss'],
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
  providers: [DatePipe],
})
export class NewParameterApprovalSearchComponent extends ParameterTrialSearchBase<INewParameterApproval> {
  protected readonly viewDialogComponent = ViewComponent;
  protected readonly listPayloadKey = 'new_parameter_approval_list';
  protected readonly errorItemLabel = 'parameter approval';
  protected readonly errorSnackbarTitle = 'Parameter Approval Error';
  protected readonly defaultStatus = [2];
  protected readonly inProgressStatusCodes = new Set([
    'PENDING_TO_APPROVE',
    'PENDING_TO_REJECTED',
  ]);

  headerData = NewParameterApprovalHeader;

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
      status: [2],
      last_updated_start: this.initDefaultMonth().effective_date_from,
      last_updated_end: this.initDefaultMonth().effective_date_till,
    },
    search_text: null,
    sort_order: [{ name: 'last_update', desc: true }],
  };

  // Error check parameters for New Parameter Approval
  errorCheckParams: IActionHistoryParams = {
    search_select_filter: {
      status: [3, 10],
    },
  };

  protected getSelectionObservable(): Observable<INewParameterApproval[]> {
    return this.selectionService.selection$;
  }

  protected addSelection(item: INewParameterApproval): void {
    this.selectionService.addSelection(item);
  }

  protected removeSelection(id: string | number): void {
    this.selectionService.removeSelection(id);
  }

  protected isSelected(id: string | number): boolean {
    return this.selectionService.isSelected(id);
  }

  protected getSelections(): INewParameterApproval[] {
    return this.selectionService.getSelections();
  }

  protected clearSelections(): void {
    this.selectionService.clearSelections();
  }

  protected addMultipleSelections(items: INewParameterApproval[]): void {
    this.selectionService.addMultipleSelections(items);
  }

  protected removeMultipleSelections(ids: string[]): void {
    this.selectionService.removeMultipleSelections(ids);
  }

  protected searchActionErrors(
    params: IActionHistoryParams
  ): Observable<PayloadResponse> {
    return this.parameterService.searchNewParameterApprovalErrors(params);
  }

  mapDataSource(item: any, isActionHistoryView = false): INewParameterApproval {
    const depot = this.depots.find(_d => _d.depot_id === item.depot_id);
    const strDepotId = item.depot_id.toString();

    const uniqueId = generateUniqueNumberId();
    const normalizedStatus =
      isActionHistoryView && this.isInProgressStatus(item.status)
        ? 'In Progress'
        : item.status;

    return <INewParameterApproval>{
      ...item,
      id: uniqueId,
      chk: false,
      svc_prov_id: Number.parseInt(this.svcProviderID!, 10),
      depot_name: strDepotId === '0' ? 'All Depot' : depot?.depot_name,
      param_master_id: item.param_master_id,
      status: normalizedStatus,
    };
  }

  protected getUpdateViewTitle(action: string): string {
    if (action === 'update') {
      return 'Edit';
    }
    if (action === 'reject') {
      return 'Reject';
    }
    return 'Approve';
  }

  updateView(action: string): void {
    const allSelectedItems = this.getSelections();
    const paramMasterIds = this.extractParamMasterIds(allSelectedItems);
    this.openParameterTrialDialog(
      action,
      allSelectedItems,
      paramMasterIds,
      ['approve', 'reject'],
      ['cancel']
    );
  }
}
