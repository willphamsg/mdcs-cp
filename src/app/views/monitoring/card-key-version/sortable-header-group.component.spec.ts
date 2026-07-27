import { SortableHeaderGroupComponent } from './sortable-header-group.component';

describe('SortableHeaderGroupComponent', () => {
  let component: SortableHeaderGroupComponent;
  let mockGridApi: jasmine.SpyObj<any>;

  beforeEach(() => {
    component = new SortableHeaderGroupComponent();
    mockGridApi = jasmine.createSpyObj('GridApi', [
      'addEventListener',
      'applyColumnState',
      'getColumnState',
    ]);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('agInit', () => {
    it('should initialize display name, sortable flag, sort field and grid api', () => {
      component.agInit({
        displayName: 'Device ID',
        sortable: true,
        sortField: 'device_id',
        api: mockGridApi,
      } as any);

      expect(component.displayName).toBe('Device ID');
      expect(component.sortable).toBe(true);
      expect(component.sortField).toBe('device_id');
      expect(mockGridApi.addEventListener).toHaveBeenCalledWith(
        'sortChanged',
        jasmine.any(Function)
      );
    });

    it('should default sortable, sortField and displayName when not provided', () => {
      component.agInit({ api: mockGridApi } as any);

      expect(component.displayName).toBe('');
      expect(component.sortable).toBe(false);
      expect(component.sortField).toBe('');
    });
  });

  describe('refresh', () => {
    it('should update displayName and return true', () => {
      const result = component.refresh({ displayName: 'Updated' } as any);

      expect(result).toBe(true);
      expect(component.displayName).toBe('Updated');
    });
  });

  describe('onSortRequested', () => {
    beforeEach(() => {
      component.agInit({
        displayName: 'Device ID',
        sortable: true,
        sortField: 'device_id',
        api: mockGridApi,
      } as any);
    });

    it('should do nothing when not sortable', () => {
      component.sortable = false;
      component.onSortRequested();

      expect(mockGridApi.applyColumnState).not.toHaveBeenCalled();
    });

    it('should do nothing when sortField is empty', () => {
      component.sortField = '';
      component.onSortRequested();

      expect(mockGridApi.applyColumnState).not.toHaveBeenCalled();
    });

    it('should cycle from null sort state to asc', () => {
      component.sortState = null;

      component.onSortRequested();

      expect(mockGridApi.applyColumnState).toHaveBeenCalledWith({
        state: [{ colId: 'device_id', sort: 'asc' }],
        defaultState: { sort: null },
      });
    });

    it('should cycle from asc sort state to desc', () => {
      component.sortState = 'asc';

      component.onSortRequested();

      expect(mockGridApi.applyColumnState).toHaveBeenCalledWith({
        state: [{ colId: 'device_id', sort: 'desc' }],
        defaultState: { sort: null },
      });
    });

    it('should cycle from desc sort state back to null', () => {
      component.sortState = 'desc';

      component.onSortRequested();

      expect(mockGridApi.applyColumnState).toHaveBeenCalledWith({
        state: [{ colId: 'device_id', sort: null }],
        defaultState: { sort: null },
      });
    });
  });

  describe('updateSortState (via sortChanged event)', () => {
    it('should update sortState from the current column state', () => {
      let sortChangedHandler: () => void = () => {};
      mockGridApi.addEventListener.and.callFake(
        (_event: string, handler: () => void) => {
          sortChangedHandler = handler;
        }
      );
      mockGridApi.getColumnState.and.returnValue([
        { colId: 'device_id', sort: 'desc' },
      ]);

      component.agInit({
        displayName: 'Device ID',
        sortable: true,
        sortField: 'device_id',
        api: mockGridApi,
      } as any);

      sortChangedHandler();

      expect(component.sortState).toBe('desc');
    });

    it('should set sortState to null when column is not present in state', () => {
      let sortChangedHandler: () => void = () => {};
      mockGridApi.addEventListener.and.callFake(
        (_event: string, handler: () => void) => {
          sortChangedHandler = handler;
        }
      );
      mockGridApi.getColumnState.and.returnValue([
        { colId: 'other_field', sort: 'asc' },
      ]);

      component.agInit({
        displayName: 'Device ID',
        sortable: true,
        sortField: 'device_id',
        api: mockGridApi,
      } as any);

      sortChangedHandler();

      expect(component.sortState).toBeNull();
    });
  });
});
