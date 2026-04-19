---
paths:
  - "webapp/src/__tests__/**/*.test.ts"
  - "webapp/src/__tests__/**/*.test.tsx"
---

# Testing Guidelines

## Environment setup
- Default: `testEnvironment: "node"` (configured in `jest.config.js`)
- For localStorage/DOM tests: add `/** @jest-environment jsdom */` docblock at file top
- `crypto.randomUUID` polyfill in `beforeEach` for jsdom tests:
  ```typescript
  let counter = 0;
  beforeEach(() => {
    localStorage.clear();
    counter = 0;
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: () => `test-uuid-${++counter}` },
      configurable: true,
      writable: true,
    });
  });
  ```

## Test file naming
- `<module-name>.test.ts` — mirrors the lib file name
- Group with `describe("<functionName>", () => { ... })`
- One `it` per behavior, not per line of code

## Coverage expectations
- Pure calculation functions: 100% branch coverage
- localStorage CRUD stores: cover save/load/delete/update + empty state
- Edge cases to always test: empty arrays, zero values, missing optional fields, idempotency

## Fixtures
- Use factory functions (`makeInvoice(overrides?)`, `makeCampaign(overrides?)`)
- Keep fixtures minimal — only fields needed for the specific test
- Override only what's relevant: `makeCampaign({ id: "remove" })`

## What NOT to test
- UI rendering (no React Testing Library unless explicitly needed)
- Next.js API route handlers — test the underlying store/util functions directly
- Implementation details — test behavior and output, not internal state

## Running tests
```bash
npx jest                                     # all suites
npx jest --testPathPattern="campaign-store"  # single file
npx jest --coverage                          # with coverage report
```
