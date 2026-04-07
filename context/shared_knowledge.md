# Shared Knowledge Base

## Code Conventions

### TypeScript
- Strict mode enabled (`"strict": true` in tsconfig)
- Prefer `interface` over `type` for object shapes
- Use `readonly` for immutable properties
- Async/await over raw Promises
- Named exports preferred over default exports

### Git
- Commit format: `type(scope): description` (Conventional Commits)
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`
- Branch format: `{agent}/{issue-number}-{short-slug}`
- Squash merge only to keep main history clean

### Testing
- Unit tests: co-located with source (`*.test.ts`)
- Integration tests: `/tests/integration/`
- Minimum 80% line coverage required
- Mocks go in `/tests/mocks/`

## Code Review Checklist

### Correctness
- [ ] Logic matches requirements in issue
- [ ] Edge cases handled (null, empty, large input)
- [ ] Error paths return appropriate status codes

### Security
- [ ] No secrets or credentials in code
- [ ] Input validation on all external data
- [ ] SQL queries parameterized (no string concatenation)
- [ ] Authentication checked before authorization

### Performance
- [ ] No N+1 query patterns
- [ ] Heavy operations are async/non-blocking
- [ ] Appropriate indexes on DB queries

### Maintainability
- [ ] Functions < 40 lines
- [ ] Cyclomatic complexity < 10
- [ ] Public APIs documented with JSDoc
- [ ] No TODO comments without linked issues

## Common Patterns

### API Response Shape
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page: number; total: number };
}
```

### Error Handling
```typescript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (err) {
  logger.error({ err, context }, 'Operation failed');
  return { success: false, error: { code: 'OPERATION_FAILED', message: err.message } };
}
```

### Environment Variables
- All env vars in `.env.example` with descriptions
- Validated at startup using `zod` schema
- Never access `process.env` directly in business logic — use a config module
