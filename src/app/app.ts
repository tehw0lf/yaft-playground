import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiServiceFeatureProvider } from '@tehw0lf/yaft/examples/ApiServiceFeatureProvider';
import { FeatureToggleBase } from '@tehw0lf/yaft';

import seed from '../environments/seed.json';

/**
 * What the seed script wrote. `uuid` is empty until it has run, which is the
 * one failure the page has to explain rather than render as "everything off".
 */
interface Seed {
  apiUrl: string;
  uuid: string;
  secret: string;
}

/** One row of the table: what the toggle is for, and what the library says. */
interface Row {
  key: string;
  expected: boolean;
  why: string;
  actual: boolean | null;
}

/**
 * Drives @tehw0lf/yaft against a running YaFT backend.
 *
 * Every row states what it expects and why, so a mismatch names the rule that
 * broke rather than just showing a red cell. The rows that matter are the
 * time-based ones: the backend flips `value` on a cron tick up to a minute
 * late, while the library evaluates `activeAt`/`disabledAt` itself. Only a
 * real backend can show the two agreeing.
 */
@Component({
  selector: 'pg-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  // The `as Seed` alone is not enough: a JSON import resolves differently
  // under Jest than under the Angular build, and a missing file would
  // otherwise crash ngOnInit with "cannot read properties of undefined"
  // instead of showing the "run the seed script" message this page exists to
  // show.
  readonly seed: Seed = { apiUrl: '', uuid: '', secret: '', ...(seed ?? {}) };
  readonly error = signal<string>('');
  readonly ready = signal(false);

  readonly rows = signal<Row[]>([
    {
      key: 'alwaysOn',
      expected: true,
      why: 'value is "true" and no bounds are set',
      actual: null,
    },
    {
      key: 'alwaysOff',
      expected: false,
      why: 'value is "false"',
      actual: null,
    },
    {
      key: 'notYetActive',
      expected: false,
      why: 'activeAt is a year away, so the window has not opened',
      actual: null,
    },
    {
      key: 'alreadyDisabled',
      expected: false,
      why: 'disabledAt was yesterday, so the window has closed',
      actual: null,
    },
    {
      key: 'insideWindow',
      expected: true,
      why: 'now is between activeAt and disabledAt',
      actual: null,
    },
    {
      key: 'outsideWindow',
      expected: false,
      why: 'the whole window is in the future',
      actual: null,
    },
    {
      key: 'noSuchToggle',
      expected: false,
      why: 'a key the backend has never heard of is off, not an error',
      actual: null,
    },
  ]);

  async ngOnInit(): Promise<void> {
    if (!this.seed.uuid) {
      this.error.set(
        'No seed data. Run scripts/backend.sh up and scripts/seed.sh first.',
      );
      return;
    }

    try {
      const provider = new ApiServiceFeatureProvider(
        this.seed.apiUrl,
        this.seed.uuid,
      );
      FeatureToggleBase.featureProvider = provider;

      // The constructor fetches the collection hash and then the toggles, both
      // asynchronously, so the first render would otherwise see empty data.
      await this.settled(() => Object.keys(provider.data).length > 0);

      // Keys are stored under the full `uuid|name`, which is what the backend
      // returns and what isEnabled expects. Looking up the bare name yields
      // "missing key", which evaluates to false -- so every expected-false row
      // would pass for the wrong reason while the true ones failed.
      this.rows.update((rows) =>
        rows.map((row) => ({
          ...row,
          actual: provider.isEnabled(this.fullKey(row.key)),
        })),
      );
      this.ready.set(true);
    } catch (e) {
      this.error.set(`Failed to reach ${this.seed.apiUrl}: ${e}`);
    }
  }

  /**
   * The key as the backend stores it. A toggle created as `alwaysOn` in the
   * group `<uuid>` is addressed as `<uuid>|alwaysOn`; `noSuchToggle` is
   * deliberately absent, and gets the same treatment so the lookup path is
   * identical.
   */
  private fullKey(name: string): string {
    return `${this.seed.uuid}|${name}`;
  }

  /** Whether every row matched, which is what the E2E test asserts on. */
  allMatch(): boolean {
    return this.rows().every((r) => r.actual === r.expected);
  }

  private async settled(done: () => boolean, tries = 50): Promise<void> {
    for (let i = 0; i < tries; i++) {
      if (done()) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('the provider never loaded any feature data');
  }
}
