---
paths:
  - "webapp/src/app/api/**/*.ts"
---

# API Route Guidelines

## Response shape
```typescript
// Success
NextResponse.json({ success: true, data: ... })

// Error
NextResponse.json({ success: false, error: "human-readable message" }, { status: 4xx | 5xx })
```

## AI routes pattern
```typescript
import { generateText, stripJsonFences } from "@/lib/ai-provider";

try {
  const raw = await generateText(prompt, { maxTokens: N });
  const parsed = JSON.parse(stripJsonFences(raw)) as ExpectedType;
  return NextResponse.json({ success: true, ...parsed });
} catch {
  return NextResponse.json(MOCK_FALLBACK); // never throw to client
}
```

## Input validation
- Parse and validate request body at the top of the handler
- Return 400 for missing/invalid required fields before calling AI
- All string inputs: `.trim()`, check for empty

## Security
- No secrets in response bodies
- Validate `Content-Type: application/json` for POST routes
- Instagram handle validation: never reflect raw user input in errors

## Mock fallback
Every AI route must have a `const MOCK_RESPONSE` constant used when the API key is missing
or the AI call fails. This ensures the UI always works without API keys configured.

## File structure
```
/api/<feature>/route.ts          — main CRUD handler
/api/<feature>/<action>/route.ts — specific action (generate, suggest, validate)
```
