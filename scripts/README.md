# Scripts Directory

This directory contains utility scripts for n8n development and analysis.

## Circular Reference Analysis Tools

Tools to analyze execution data and determine if the `flatted` library can be replaced with native JSON operations for better performance.

### Quick Start

```bash
# Analyze 1000 random executions for circular references
pnpm tsx scripts/analyze-circular-refs-simple.ts

# Check a specific execution
pnpm tsx scripts/check-execution-circular-ref.ts <execution-id>
```

### Files

- **`analyze-circular-refs-simple.ts`** - Main database analysis script
- **`check-execution-circular-ref.ts`** - Single execution inspector
- **`CIRCULAR_REF_ANALYSIS.md`** - Complete documentation

See [CIRCULAR_REF_ANALYSIS.md](./CIRCULAR_REF_ANALYSIS.md) for detailed usage instructions.

For background and context, see [../CIRCULAR_REF_ANALYSIS_SUMMARY.md](../CIRCULAR_REF_ANALYSIS_SUMMARY.md).
