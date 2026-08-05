import { TestBed } from '@angular/core/testing';
import { RodaService } from './roda.service';

const STORAGE_KEY = 'capoeira-roda';

describe('RodaService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  function makeService(): RodaService {
    return TestBed.inject(RodaService);
  }

  it('starts empty when nothing is stored', () => {
    const service = makeService();
    expect(service.ids()).toEqual([]);
    expect(service.count()).toBe(0);
  });

  it('adds songs in order and reports them queued', () => {
    const service = makeService();
    service.add('s1');
    service.add('s2');
    expect(service.ids()).toEqual(['s1', 's2']);
    expect(service.count()).toBe(2);
    expect(service.has('s1')).toBe(true);
    expect(service.has('s3')).toBe(false);
  });

  it('does not add the same song twice', () => {
    const service = makeService();
    service.add('s1');
    service.add('s1');
    expect(service.ids()).toEqual(['s1']);
  });

  it('removes a song by id', () => {
    const service = makeService();
    service.add('s1');
    service.add('s2');
    service.remove('s1');
    expect(service.ids()).toEqual(['s2']);
    expect(service.has('s1')).toBe(false);
  });

  it('reorders by swapping with the previous or next entry', () => {
    const service = makeService();
    service.add('s1');
    service.add('s2');
    service.add('s3');

    service.reorder(0, 1); // move s1 down past s2
    expect(service.ids()).toEqual(['s2', 's1', 's3']);

    service.reorder(2, -1); // move s3 up past s1
    expect(service.ids()).toEqual(['s2', 's3', 's1']);
  });

  it('ignores reorder past either end of the list', () => {
    const service = makeService();
    service.add('s1');
    service.add('s2');

    service.reorder(0, -1); // already first
    expect(service.ids()).toEqual(['s1', 's2']);

    service.reorder(1, 1); // already last
    expect(service.ids()).toEqual(['s1', 's2']);
  });

  it('clears the whole queue', () => {
    const service = makeService();
    service.add('s1');
    service.add('s2');
    service.clear();
    expect(service.ids()).toEqual([]);
  });

  it('persists to localStorage under the capoeira-roda key', () => {
    const service = makeService();
    service.add('s1');
    service.add('s2');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['s1', 's2']);

    service.remove('s1');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['s2']);

    service.clear();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([]);
  });

  it('reads a previously persisted queue back on construction', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['a', 'b']));
    const service = makeService();
    expect(service.ids()).toEqual(['a', 'b']);
  });

  it('ignores corrupt localStorage content instead of throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const service = makeService();
    expect(service.ids()).toEqual([]);
  });
});
