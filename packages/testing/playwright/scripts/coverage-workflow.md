# Playwright Coverage Workflow

This document explains how to generate HTML coverage reports from your Playwright tests to see exactly which parts of your code are being hit.

## Overview

The coverage workflow consists of three main steps:

1. **Build with Coverage**: Build the editor-ui with istanbul instrumentation
2. **Run Tests with Coverage**: Execute Playwright tests that collect coverage data
3. **Generate HTML Report**: Convert NYC coverage data into readable HTML reports

## Step-by-Step Instructions

### 1. Build Editor-UI with Coverage Instrumentation

First, build the editor-ui with coverage enabled:

```bash
# From the project root
pnpm --filter n8n-editor-ui build:coverage
```

This will:
- Enable istanbul instrumentation in the Vite build
- Create instrumented JavaScript files in the `dist/` directory
- Add coverage collection hooks to your code

### 2. Run Playwright Tests with Coverage Collection

Run your Playwright tests with coverage collection enabled:

```bash
# From the playwright package directory
cd packages/testing/playwright

# Run UI tests
pnpm test:ui

```

This will:
- Execute your Playwright tests
- Collect coverage data as tests interact with the instrumented code
- Store coverage data in NYC format

### 3. Generate HTML Coverage Report

Generate a detailed HTML report from the collected coverage data:

```bash
# From the playwright package directory
pnpm coverage:report
```

This will:
- Find and merge all coverage files
- Generate an HTML report showing exactly which lines are covered
- Create a detailed coverage analysis

### 4. View the Coverage Report

Open the generated HTML report in your browser:

```bash
# The report will be available at:
open coverage/index.html

# Or navigate to:
file:///path/to/packages/testing/playwright/coverage/index.html
```

## Understanding the Coverage Report

The HTML report will show you:

- **Overall Coverage**: Percentage of statements, branches, functions, and lines covered
- **File-by-File Breakdown**: Coverage for each source file
- **Line-by-Line Details**: Exactly which lines are covered (green) vs uncovered (red)
- **Branch Coverage**: Which conditional branches are tested
- **Function Coverage**: Which functions are called during tests

## Troubleshooting

### No Coverage Data Found

If you see "No coverage files found":

1. Ensure you built with coverage: `pnpm --filter n8n-editor-ui build:coverage`
2. Run tests with coverage enabled: `COVERAGE_ENABLED=true pnpm test:ui`
3. Check that coverage files exist in the expected locations

### Low Coverage Percentage

If you see low coverage (like 15%):

1. **Check the HTML report** to see which specific files/lines are uncovered
2. **Look for untested code paths** in your components
3. **Add more test scenarios** to cover missing branches
4. **Focus on critical user flows** that should have high coverage

### Coverage Data Not Merging

If multiple coverage files aren't merging:

1. Check that all coverage files are in valid NYC format
2. Ensure the files contain actual coverage data (not empty)
3. Try running the merge command manually: `npx nyc merge coverage/*.json .nyc_output/out.json`

## Advanced Usage

### Custom Coverage Configuration

You can modify `nyc.config.js` to:
- Change coverage thresholds
- Exclude specific files or patterns
- Adjust report formats
- Set custom watermarks

### CI/CD Integration

For automated coverage reporting:

```yaml
# Example GitHub Actions step
- name: Generate Coverage Report
  run: |
    pnpm --filter n8n-editor-ui build:coverage
    pnpm --filter n8n-playwright test:ui:coverage
    pnpm --filter n8n-playwright coverage:report
  env:
    COVERAGE_ENABLED: true
```

### Coverage Thresholds

Set minimum coverage requirements in `nyc.config.js`:

```javascript
checkCoverage: true,
statements: 80,
branches: 80,
functions: 80,
lines: 80
```

## File Structure

After running the coverage workflow, you'll have:

```
packages/testing/playwright/
├── coverage/                 # HTML coverage reports
│   ├── index.html           # Main coverage report
│   ├── base.css             # Report styling
│   └── ...                  # Individual file reports
├── .nyc_output/             # Raw coverage data
│   └── out.json            # Merged coverage data
├── nyc.config.js           # NYC configuration
└── scripts/
    └── generate-coverage-report.js  # Report generation script
```

## Best Practices

1. **Regular Coverage Checks**: Run coverage reports regularly to catch coverage regressions
2. **Focus on Critical Paths**: Prioritize coverage for user-facing features and business logic
3. **Review Uncovered Code**: Use the HTML report to identify and test uncovered code paths
4. **Set Realistic Thresholds**: Don't aim for 100% coverage - focus on meaningful coverage
5. **Clean Up**: Use `pnpm coverage:clean` to remove old coverage data when needed

## Common Issues

### "Cannot find module" errors
- Ensure the editor-ui is built with coverage before running tests
- Check that the build output includes instrumented files

### Empty coverage reports
- Verify that tests are actually running and interacting with the UI
- Check that the coverage instrumentation is working correctly
- Ensure tests are not running in headless mode without proper setup

### Performance impact
- Coverage instrumentation adds overhead - use only when needed
- Consider running coverage tests separately from regular test runs
- Use coverage data to guide test improvements, not as a strict requirement
