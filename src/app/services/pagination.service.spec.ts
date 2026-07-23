import { TestBed } from '@angular/core/testing';
import { PaginationService } from './pagination.service';
import { IParams, IPaginationEvent } from '@app/models/common';
import { environment } from '@env/environment';

describe('PaginationService', () => {
  let service: PaginationService;

  const mockParams: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {},
  };

  const mockData = Array.from({ length: 25 }, (_, i) => `Item ${i + 1}`);

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaginationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load data and paginate correctly', () => {
    environment.useDummyData = false;
    service.loadData(mockData, 10, 1, 25);

    service.paginatedData$.subscribe(data => {
      expect(data.length).toBe(25);
      expect(data[0]).toBe('Item 1');
    });
  });

  it('should paginate data correctly for page 2', () => {
    environment.useDummyData = false;
    service.loadData(mockData, 10, 2, 25);

    service.paginatedData$.subscribe(data => {
      expect(data.length).toBe(25);
      expect(data[0]).toBe('Item 1');
    });
  });

  it('should handle page events and call reloadCallback', () => {
    const mockEvent: IPaginationEvent = { page: 2, pageSize: 5 };
    const reloadCallback = jasmine.createSpy('reloadCallback');

    service.handlePageEvent(mockParams, mockEvent, reloadCallback);

    expect(mockParams.page_size).toBe(5);
    expect(mockParams.page_index).toBe(1);
    expect(reloadCallback).toHaveBeenCalled();
  });

  it('should return the correct total pages', () => {
    service.loadData(mockData, 10, 1, 25);

    expect(service.getTotalPages(25)).toBe(3);
  });

  it('should clear pagination data', () => {
    service.clearPagination();

    service.paginatedData$.subscribe(data => {
      expect(data.length).toBe(0);
    });

    expect(service.currentPage).toBe(1);
    expect(service.pageSize).toBe(10);
    expect(service.totalItems).toBe(0);
  });
});
