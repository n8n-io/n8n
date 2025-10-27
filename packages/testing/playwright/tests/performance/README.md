# Performance Testing Helper

A simple toolkit for measuring and asserting performance in Playwright tests.

## Quick Start

### "I just want to measure how long something takes"
```typescript
const duration = await measurePerformance(page, 'open-node', async () => {
  await n8n.canvas.openNode('Code');
});
console.log(`Opening node took ${duration.toFixed(1)}ms`);
```

### "I want to ensure an action completes within a time limit"
```typescript
const openNodeDuration = await measurePerformance(page, 'open-node', async () => {
  await n8n.canvas.openNode('Code');
});
expect(openNodeDuration).toBeLessThan(2000); // Must complete in under 2 seconds
```

### "I want to measure the same action multiple times"
```typescript
const stats = [];
for (let i = 0; i < 20; i++) {
  const duration = await measurePerformance(page, `open-node-${i}`, async () => {
    await n8n.canvas.openNode('Code');
  });
	await n8n.ndv.clickBackToCanvasButton();
  stats.push(duration);
}
const average = stats.reduce((a, b) => a + b, 0) / stats.length;
console.log(`Average: ${average.toFixed(1)}ms`);
expect(average).toBeLessThan(2000);
```

### "I want to set performance budgets for different actions"
```typescript
const budgets = {
  triggerWorkflow: 8000,  // 8 seconds
  openLargeNode: 2500,   // 2.5 seconds
};

// Measure workflow execution
const triggerDuration = await measurePerformance(page, 'trigger-workflow', async () => {
  await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful');
});
expect(triggerDuration).toBeLessThan(budgets.triggerWorkflow);

// Measure node opening
const openDuration = await measurePerformance(page, 'open-large-node', async () => {
  await n8n.canvas.openNode('Code');
});
expect(openDuration).toBeLessThan(budgets.openLargeNode);
```

### "I want to test performance with different data sizes"
```typescript
const testData = [
  { size: 30000, budgets: { triggerWorkflow: 8000, openLargeNode: 2500 } },
  { size: 60000, budgets: { triggerWorkflow: 15000, openLargeNode: 6000 } },
];

testData.forEach(({ size, budgets }) => {
  test(`performance - ${size.toLocaleString()} items`, async ({ page }) => {
    // Setup test with specific data size
    await setupTest(size);

    // Measure against size-specific budgets
    const duration = await measurePerformance(page, 'trigger-workflow', async () => {
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification('Successful')
    });
    expect(duration).toBeLessThan(budgets.triggerWorkflow);
  });
});
```

### "I want to see all performance metrics from my test"
```typescript
// After running various performance measurements...
const allMetrics = await getAllPerformanceMetrics(page);
console.log('All performance metrics:', allMetrics);
// Output: { 'open-node': 1234.5, 'save-workflow': 567.8, ... }
```

### "I want to attach performance results to my test report"
```typescript
const allMetrics = await getAllPerformanceMetrics(page);
await test.info().attach('performance-metrics', {
  body: JSON.stringify({
    dataSize: 30000,
    metrics: allMetrics,
    budgets: { triggerWorkflow: 8000, openLargeNode: 2500 },
    passed: {
      triggerWorkflow: allMetrics['trigger-workflow'] < 8000,
      openNode: allMetrics['open-large-node'] < 2500,
    }
  }, null, 2),
  contentType: 'application/json',
});
```

## API Reference

### `measurePerformance(page, actionName, actionFn)`
Measures the duration of an async action using the Performance API.
- **Returns:** `Promise<number>` - Duration in milliseconds

### `getAllPerformanceMetrics(page)`
Retrieves all performance measurements from the current page.
- **Returns:** `Promise<Record<string, number>>` - Map of action names to durations

## Tips

- Use unique names for measurements in loops (e.g., `open-node-${i}`) to avoid conflicts
- Set realistic budgets - add some buffer to account for variance
- Consider different budgets for different data sizes or environments
