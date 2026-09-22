# yaft-playground

Proves that [`@tehw0lf/yaft`](https://github.com/tehw0lf/yaft-ts) works against
a running YaFT backend, not just against mocks.

The library's own suite runs against fixtures and mocked HTTP responses, and
[yaft-conformance](https://github.com/tehw0lf/yaft-conformance) runs against
case data. Neither can catch the library and the backend disagreeing about
what a response means. This repository closes that gap, and it has already
earned its keep twice:

- the group response used capitalised field names while a single toggle used
  lowercase, so a client normalising with `a.Key || a.key` silently read an
  off feature as on;
- the published npm package had no entry points at all, so
  `import ... from '@tehw0lf/yaft'` could not resolve. This is the first
  consumer to install the package rather than reach into the repository, which
  is why nothing had noticed.

## Running it

```bash
npm install
npm run backend:up      # pulls the published images, waits for the API
npm run backend:seed    # creates the toggles, writes src/environments/seed.json
npm start               # http://localhost:4200
```

```bash
npm run e2e             # Playwright against the running backend
npm run backend:down    # stop it and drop the volume
```

The seed computes its timestamps at seed time, so a window that is meant to be
open is open whenever you run it.

## What it checks

| Toggle | Expected | Why |
|---|---|---|
| `alwaysOn` | on | value is `"true"`, no bounds |
| `alwaysOff` | off | value is `"false"` |
| `notYetActive` | off | `activeAt` is a year away |
| `alreadyDisabled` | off | `disabledAt` was yesterday |
| `insideWindow` | on | now is between the two bounds |
| `outsideWindow` | off | the whole window is in the future |
| `noSuchToggle` | off | an unknown key is off, not an error |

The time-based rows are the ones that need a real backend. The backend flips
`value` on a cron tick up to a minute late, while the library evaluates
`activeAt`/`disabledAt` itself — so for a while the two hold different values
and must still reach the same answer. Fixtures cannot show that.

The matrix is deliberately not exhaustive: decorator targets, fallbacks and
every rejected timestamp format are already covered by the 90 cases in
yaft-conformance, which run in the library's own CI. Duplicating them in a
browser would add runtime, not coverage.

## License

MIT
