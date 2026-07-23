import { Injectable } from '@angular/core';
import { IPaginationEvent, IParams } from '@app/models/common';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaginationService {
  private dataSource: any[] = [];
  private readonly paginatedDataSubject = new BehaviorSubject<any[]>([]);
  paginatedData$ = this.paginatedDataSubject.asObservable();

  pageSize = 10;
  currentPage = 1;
  totalItems = 0;

  loadData(
    data: any[],
    itemsPerPage: number,
    currentPage: number,
    totalItems: number
  ) {
    this.dataSource = data;
    this.pageSize = itemsPerPage;
    this.totalItems = totalItems;
    this.currentPage = currentPage;

    // Deferred: remove dummy pagination when all pages are integrated with BE.
    if (environment?.useDummyData) {
      this.paginateData();
    } else {
      this.paginatedDataSubject.next(this.dataSource);
    }
  }

  paginateData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Number(startIndex) + Number(this.pageSize);
    const paginatedData = this.dataSource.slice(startIndex, endIndex);

    this.paginatedDataSubject.next(paginatedData);
  }

  handlePageEvent(
    params: IParams,
    event: IPaginationEvent,
    reloadCallback: () => void,
    resetPage: boolean = false
  ): void {
    // Ensure pageSize is a number, not a string
    const pageSize =
      typeof event.pageSize === 'string'
        ? Number(event.pageSize)
        : event.pageSize;
    params.page_size = pageSize;
    this.pageSize = pageSize; // Update service pageSize for consistency
    params.page_index = resetPage ? 0 : event.page - 1;

    if (resetPage) {
      this.currentPage = 1;
    } else {
      this.currentPage = event.page;
    }

    reloadCallback();
  }

  goToPage(pageNumber: number) {
    this.currentPage = pageNumber;
    this.paginateData();
  }

  getTotalPages(totalItems: number): number {
    return Math.ceil(totalItems / this.pageSize);
  }

  setItemsPerPage(itemsPerPage: number) {
    this.pageSize = itemsPerPage;
    this.currentPage = 1;
    this.paginateData();
  }

  clearPagination(): void {
    this.dataSource = [];
    this.paginatedDataSubject.next([]);
    this.pageSize = 10;
    this.currentPage = 1;
    this.totalItems = 0;
  }
}
