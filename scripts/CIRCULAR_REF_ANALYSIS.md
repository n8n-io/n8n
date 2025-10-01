# Circular Reference Analysis Scripts

This directory contains scripts to analyze execution data and determine what percentage contains circular references. This analysis helps determine whether the `flatted` library can be safely replaced with native `JSON.stringify/parse` for better performance.

## Background

The n8n codebase currently uses the `flatted` library to serialize/deserialize execution data because it can handle circular references. However, circular references may be rare in practice, and native JSON operations are significantly faster.

## Scripts

### 1. Simple Standalone Script (Recommended)

**File:** `scripts/analyze-circular-refs-simple.ts`

This is a standalone script that directly connects to the database and performs the analysis. It's the easiest to run and doesn't require the full n8n initialization.

#### Prerequisites

```bash
# Install dependencies if not already installed
pnpm install
```

#### Usage

```bash
# Analyze 1000 random executions (default)
pnpm tsx scripts/analyze-circular-refs-simple.ts

# Analyze 500 random executions
pnpm tsx scripts/analyze-circular-refs-simple.ts 500

# Analyze ALL executions (may take a long time)
pnpm tsx scripts/analyze-circular-refs-simple.ts all
```

#### Environment Variables

The script respects the following environment variables for database configuration:

**For PostgreSQL:**
```bash
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=postgres
DB_POSTGRESDB_PASSWORD=your_password
DB_POSTGRESDB_SCHEMA=public
```

**For SQLite (default):**
```bash
DB_TYPE=sqlite
DB_SQLITE_DATABASE=/path/to/database.sqlite
# Or use N8N_USER_FOLDER
N8N_USER_FOLDER=~/.n8n
```

### 2. CLI Command (Alternative)

**File:** `packages/cli/src/commands/analyze-circular-refs.ts`

This is integrated into the n8n CLI and follows the standard command pattern.

#### Usage

```bash
# From the CLI package
cd packages/cli
pnpm build

# Run the command
node bin/n8n analyze-circular-refs

# With options
node bin/n8n analyze-circular-refs --sample-size=500
node bin/n8n analyze-circular-refs --all
```

## Output

Both scripts provide the same output format:

```
================================================================================
CIRCULAR REFERENCE ANALYSIS RESULTS
================================================================================

Total executions analyzed: 1000
Executions with circular references: 5
Executions serializable with JSON.stringify: 995

📊 Percentage with circular refs: 0.50%
📊 Percentage serializable with JSON: 99.50%

🔍 Sample execution IDs with circular refs (first 10):
  - 12345
  - 67890

================================================================================

💡 RECOMMENDATION:

⚠️  Consider replacing flatted with conditional handling
   Only 0.50% of executions have circular refs.
   Could use JSON.stringify with try/catch fallback.

================================================================================
```

## Recommendations Based on Results

The script provides automatic recommendations based on the percentage of executions with circular references:

### 0% Circular References
✅ **Safe to replace flatted with JSON.stringify/parse**
- No circular references found
- Can directly replace all `flatted` usage
- Expected performance improvement: ~2-5x faster

### < 1% Circular References
⚠️ **Consider conditional handling**
- Very few circular references
- Implement try/catch fallback:
  ```typescript
  function safeParse(data: string) {
    try {
      return JSON.parse(data);
    } catch (error) {
      if (error.message.includes('circular')) {
        return parse(data); // fallback to flatted
      }
      throw error;
    }
  }
  ```

### 1-10% Circular References
⚠️ **Investigate sources before replacing**
- Significant but manageable percentage
- Identify which nodes create circular refs
- Consider fixing the root cause in those nodes
- Then replace `flatted`

### > 10% Circular References
❌ **Keep flatted or fix issues first**
- Too many circular references
- Investigate why they're occurring
- Fix root causes in nodes
- Then re-analyze

## What Gets Analyzed

The script analyzes:
- Execution data stored in the `execution_data` table
- The `data` column which contains stringified execution results
- Checks if each can be serialized with `JSON.stringify()` after parsing with `flatted.parse()`

## Performance Considerations

- **Small samples (< 1000):** Takes a few seconds
- **Medium samples (1000-10000):** Takes 30 seconds to a few minutes
- **All executions:** Can take 10+ minutes depending on database size

For initial analysis, a sample of 1000 executions is usually sufficient to get accurate statistics.

## Troubleshooting

### "Failed to open database"
- Check that the database path is correct
- Ensure you have read permissions
- Verify the n8n instance is not running (for SQLite)

### "Connection refused"
- For PostgreSQL, check that the database is running
- Verify connection credentials
- Check firewall settings

### Memory issues with "--all"
- For large databases, the script may consume significant memory
- Start with smaller samples to verify it works
- Consider analyzing in production environment with more resources

## Next Steps After Analysis

1. **If < 1% circular refs:**
   - Create a PR to replace `flatted` with conditional logic
   - Add performance benchmarks
   - Test thoroughly with real execution data

2. **If 1-10% circular refs:**
   - Run the script with sample IDs to inspect problematic executions
   - Identify which nodes create circular references
   - Fix those nodes first
   - Re-analyze

3. **If > 10% circular refs:**
   - Deep dive into why circular refs are so common
   - This may indicate an underlying issue
   - Consider if the data structure design needs changes
