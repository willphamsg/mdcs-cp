import type { IHeaderGroupAngularComp } from 'ag-grid-angular';
import type { IHeaderGroupParams } from 'ag-grid-community';
import { Component } from '@angular/core';

interface SortableHeaderGroupParams extends IHeaderGroupParams {
  sortable?: boolean;
  sortField?: string;
}

@Component({
  selector: 'app-sortable-header-group',
  standalone: true,
  imports: [],
  template: `
    <div
      class="sortable-header-group"
      [class.clickable]="sortable"
      (click)="onSortRequested()">
      <span class="header-label">{{ displayName }}</span>
      @if (sortable) {
        <img [src]="sortIcon" class="sort-icon" />
      }
    </div>
  `,
  styles: [
    `
      .sortable-header-group {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        gap: 4px;
        white-space: pre-line;
      }
      .sortable-header-group.clickable {
        cursor: pointer;
      }
      .header-label {
        text-align: center;
        font-size: 16px;
        color: #fff;
        font-family: 'Inter';
      }
      .sort-icon {
        width: 16px;
        height: 16px;
      }
    `,
  ],
})
export class SortableHeaderGroupComponent implements IHeaderGroupAngularComp {
  displayName = '';
  sortable = false;
  sortField = '';
  sortState: 'asc' | 'desc' | null = null;

  private params: SortableHeaderGroupParams;
  private gridApi: any;

  get sortIcon(): string {
    return 'assets/icons/sort.svg';
  }

  agInit(params: SortableHeaderGroupParams): void {
    this.params = params;
    this.displayName = params.displayName || '';
    this.sortable = params.sortable ?? false;
    this.sortField = params.sortField || '';
    this.gridApi = params.api;

    // Listen for sort changes to update icon state
    if (this.gridApi) {
      this.gridApi.addEventListener('sortChanged', () => {
        this.updateSortState();
      });
    }
  }

  refresh(params: SortableHeaderGroupParams): boolean {
    this.params = params;
    this.displayName = params.displayName || '';
    return true;
  }

  onSortRequested(): void {
    if (!this.sortable || !this.sortField || !this.gridApi) return;

    // Cycle through: asc -> desc -> none
    let nextSort: 'asc' | 'desc' | null;
    if (this.sortState === null) {
      nextSort = 'asc';
    } else if (this.sortState === 'asc') {
      nextSort = 'desc';
    } else {
      nextSort = null;
    }

    this.gridApi.applyColumnState({
      state: [{ colId: this.sortField, sort: nextSort }],
      defaultState: { sort: null },
    });
  }

  private updateSortState(): void {
    if (!this.gridApi || !this.sortField) return;

    const columnState = this.gridApi.getColumnState();
    const col = columnState.find((c: any) => c.colId === this.sortField);
    this.sortState = col?.sort || null;
  }
}
