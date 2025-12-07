# Build Validation Scripts

## Quick Validation (Before Pushing)

```bash
./scripts/validate-build.sh
```

This runs:
1. ✅ Build critical packages (@n8n/api-types + CLI)
2. ✅ TypeScript type checking
3. ✅ Code formatting (auto-fix)

**Takes ~2-3 minutes** - much faster than waiting for production build to fail!

## VSCode Integration

Press `F5` in VSCode and select:
- **"Build: Check for Errors (Quick)"** - Fast validation (2-3 min)
- **"Build: Full Validation"** - Complete build (5-10 min)
- **"TypeCheck: All Packages"** - Type checking only (1 min)

## Manual Commands

```bash
# Quick build check (what you need 90% of the time)
pnpm build --filter @n8n/api-types --filter n8n

# Full build (before major releases)
pnpm build

# Type checking only
pnpm typecheck

# Lint + format
cd packages/cli
pnpm biome check --write
pnpm prettier --write "src/**/*.ts"
```

## Common Build Errors

### Missing Exports
**Error**: `Module '"@n8n/api-types"' has no exported member 'XyzDto'`

**Fix**: Add export to `packages/@n8n/api-types/src/dto/index.ts`:
```typescript
export { XyzDto } from './path/to/xyz.dto';
```

### Missing Imports
**Error**: `Cannot find name 'SomeError'`

**Fix**: Import the missing class:
```typescript
import { SomeError } from './errors/some.error';
```

### Zod Type Errors
**Error**: `Type 'ZodObject<...>' is missing properties...`

**Cause**: Upstream dependency version conflicts (zod/zod-class)

**Fix**: These are usually safe to ignore if:
- Your changes don't touch the affected files
- You can run `pnpm dev` successfully
- No actual runtime errors occur

## CI/CD Integration

Add to your git hooks or CI pipeline:

```bash
# .git/hooks/pre-push (optional)
#!/bin/bash
./scripts/validate-build.sh
```

Or use in GitHub Actions:

```yaml
- name: Validate Build
  run: ./scripts/validate-build.sh
```
