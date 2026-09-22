import { TestBed } from '@angular/core/testing';

import { App } from './app';

/**
 * The E2E suite is what proves the library works against a real backend; this
 * covers the small amount of logic in the page that has nothing to do with the
 * backend, so a mistake there does not masquerade as a library failure.
 */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('explains itself rather than rendering "all off" without a seed', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    await app.ngOnInit();

    // seed.example.json has an empty uuid, which is what a fresh checkout has.
    expect(app.error()).toContain('No seed data');
    expect(app.ready()).toBe(false);
  });

  it('starts with every row unresolved', () => {
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.rows().every((r) => r.actual === null)).toBe(true);
  });

  it('does not claim a match while rows are unresolved', () => {
    const app = TestBed.createComponent(App).componentInstance;
    // null !== false, so an unresolved row cannot count as agreeing with an
    // expected-false row -- otherwise a page that never loaded would look green.
    expect(app.allMatch()).toBe(false);
  });
});
