import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationService } from '@app/services/pagination.service';

@Component({
  selector: 'app-pagination',
  imports: [FormsModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent implements OnDestroy {
  private _totalItems: number = 0;

  @Output() pageChange = new EventEmitter<{ page: number; pageSize: number }>();

  currentPage: number = 1;
  itemsPerPage: number = 10;
  pageSizeOptions: number[] = [];

  @Input()
  set totalItems(value: number) {
    this._totalItems = value;
    this.generatePageSizeOptions();
  }
  get totalItems(): number {
    return this._totalItems;
  }

  @Input()
  set currentPageInput(value: number) {
    this.currentPage = value;
  }

  @Input()
  set itemsPerPageInput(value: number) {
    if (value) {
      this.itemsPerPage = value;
      this.generatePageSizeOptions();
    }
  }

  constructor(private readonly paginationService: PaginationService) {}

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage) || 0;
  }

  ngOnDestroy(): void {
    this.paginationService.clearPagination();
  }

  generatePageSizeOptions(): void {
    // Fixed page size options (max capped at 500 on the front end side).
    this.pageSizeOptions = [10, 20, 50, 100, 200, 500];
    // for (let i = 10; i <= maxPageSize; i += 10) {
    //   this.pageSizeOptions.push(i);
    // }

    // Ensure the current itemsPerPage is included in the options
    if (
      this.itemsPerPage &&
      !this.pageSizeOptions.includes(this.itemsPerPage)
    ) {
      this.pageSizeOptions.push(this.itemsPerPage);
      this.pageSizeOptions.sort((a, b) => a - b);
    }
  }

  onItemsPerPageChange(): void {
    // Ensure itemsPerPage is a number, not a string
    this.itemsPerPage =
      typeof this.itemsPerPage === 'string'
        ? Number(this.itemsPerPage)
        : this.itemsPerPage;
    this.paginationService.setItemsPerPage(this.itemsPerPage);
    this.currentPage = 1;
    this.emitPageChange();
  }

  getStartIndex(): number {
    let startIndex = 0;
    if (this._totalItems) {
      startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
    }
    return startIndex;
  }

  getEndIndex(): number {
    const endIndex = this.currentPage * this.itemsPerPage;
    return Math.min(endIndex, this.totalItems);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginationService.goToPage(this.currentPage);
      this.emitPageChange();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginationService.goToPage(this.currentPage);
      this.emitPageChange();
    }
  }

  emitPageChange() {
    this.pageChange.emit({
      page: this.currentPage,
      pageSize: this.itemsPerPage,
    });
  }
}
