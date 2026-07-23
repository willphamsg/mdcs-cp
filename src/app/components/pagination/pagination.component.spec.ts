import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';
import { PaginationService } from '@app/services/pagination.service';
import { FormsModule } from '@angular/forms';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;
  let paginationServiceSpy: jasmine.SpyObj<PaginationService>;

  beforeEach(async () => {
    paginationServiceSpy = jasmine.createSpyObj('PaginationService', ['getTotalPages', 'clearPagination', 'setItemsPerPage', 'goToPage']);
    paginationServiceSpy.getTotalPages.and.returnValue(5);

    await TestBed.configureTestingModule({
      imports: [PaginationComponent, FormsModule],
      providers: [
        { provide: PaginationService, useValue: paginationServiceSpy }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should go to next page', () => {
    // totalPages is calculated from totalItems/itemsPerPage, so set totalItems
    component.totalItems = 50;
    component.currentPage = 1;
    component.nextPage();
    expect(component.currentPage).toBe(2);
    expect(paginationServiceSpy.goToPage).toHaveBeenCalledWith(2);
  });

  it('should go to previous page', () => {
    component.currentPage = 3;
    component.prevPage();
    expect(component.currentPage).toBe(2);
    expect(paginationServiceSpy.goToPage).toHaveBeenCalledWith(2);
  });

  it('should not go below page 1', () => {
    component.currentPage = 1;
    component.prevPage();
    expect(component.currentPage).toBe(1);
  });

  it('should not exceed total pages', () => {
    component.totalItems = 30; // 30/10 = 3 pages
    component.currentPage = 3;
    component.nextPage();
    expect(component.currentPage).toBe(3);
  });

  it('should emit pageChange on next/prev', () => {
    spyOn(component.pageChange, 'emit');
    component.totalItems = 50; // Need enough items so nextPage works
    component.currentPage = 1;
    component.nextPage();
    expect(component.pageChange.emit).toHaveBeenCalledWith({ page: 2, pageSize: 10 });
  });

  it('should generate page size options', () => {
    component.totalItems = 100;
    expect(component.pageSizeOptions).toContain(10);
    expect(component.pageSizeOptions).toContain(50);
  });

  it('should include custom itemsPerPage in options if not preset', () => {
    component.itemsPerPage = 25;
    component.totalItems = 100;
    expect(component.pageSizeOptions).toContain(25);
  });

  it('should reset to page 1 on items per page change', () => {
    component.currentPage = 3;
    component.itemsPerPage = 20;
    component.onItemsPerPageChange();
    expect(component.currentPage).toBe(1);
    expect(paginationServiceSpy.setItemsPerPage).toHaveBeenCalledWith(20);
  });

  it('should coerce string itemsPerPage to number on change', () => {
    component.itemsPerPage = '50' as any;
    component.onItemsPerPageChange();
    expect(component.itemsPerPage).toBe(50);
  });

  it('should calculate correct start index', () => {
    component.totalItems = 100;
    component.currentPage = 2;
    component.itemsPerPage = 10;
    expect(component.getStartIndex()).toBe(11);
  });

  it('should return 0 start index when totalItems is 0', () => {
    component.totalItems = 0;
    expect(component.getStartIndex()).toBe(0);
  });

  it('should calculate correct end index', () => {
    component.totalItems = 100;
    component.currentPage = 2;
    component.itemsPerPage = 10;
    expect(component.getEndIndex()).toBe(20);
  });

  it('should cap end index at totalItems on last page', () => {
    component.totalItems = 25;
    component.currentPage = 3;
    component.itemsPerPage = 10;
    expect(component.getEndIndex()).toBe(25);
  });

  it('should call clearPagination on destroy', () => {
    component.ngOnDestroy();
    expect(paginationServiceSpy.clearPagination).toHaveBeenCalled();
  });

  it('should accept currentPageInput setter', () => {
    component.currentPageInput = 4;
    expect(component.currentPage).toBe(4);
  });

  it('should accept itemsPerPageInput setter', () => {
    component.itemsPerPageInput = 50;
    expect(component.itemsPerPage).toBe(50);
  });
});
