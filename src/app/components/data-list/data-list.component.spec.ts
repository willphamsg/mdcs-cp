import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IMessage } from '@app/models/message';
import { PaginationService } from '@app/services/pagination.service';
import { of } from 'rxjs';
import { DataListComponent } from './data-list.component';

describe('DataListComponent', () => {
  let component: DataListComponent;
  let fixture: ComponentFixture<DataListComponent>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;

  const mockMessages: IMessage[] = [
    { title: 'test1', message: 'msg1', dateTime: '2024-07-01T10:00:00', read: false },
    { title: 'test2', message: 'msg2', dateTime: '2024-07-01T11:00:00', read: true },
  ];

  beforeEach(async () => {
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'paginatedData$',
      'loadData',
      'paginateData',
      'getTotalPages',
      'clearPagination',
      'handlePageEvent',
    ]);
    mockPaginationService.paginatedData$ = of(mockMessages);

    await TestBed.configureTestingModule({
      providers: [
        { provide: PaginationService, useValue: mockPaginationService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DataListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set the headerName input', () => {
    component.headerName = 'Notifications';
    expect(component.headerName).toBe('Notifications');
  });

  it('should accept a list input', () => {
    component.list = mockMessages;
    expect(component.list.length).toBe(2);
  });

  it('should default list to empty array', () => {
    expect(component.list).toEqual([]);
  });

  it('should have paginatedList$ as observable', (done) => {
    component.paginatedList$.subscribe(val => {
      expect(val).toEqual([]);
      done();
    });
  });
});
