# Playwright Test Troubleshooting

Known issues and solutions for common test failures.

## 1. Hover/Tooltip Test Flakiness

**Problem:** Hover and tooltip tests become unreliable when running in parallel

**Root Cause:** When multiple tests run in parallel, the browser becomes overloaded and begins coalescing or delaying mouse events to maintain performance. Unlike page loads (which the browser commits to completing), hover interactions trigger chains of small, low-priority events that can be delayed or combined when the system is stressed.

**What happens under load:**
- Multiple mousemove/pointermove events get merged into single events
- The rendering pipeline (event → framework update → style → paint) gets backed up
- Tooltip appearances become unpredictable as the browser skips frames to catch up

**Solution:** Run these tests serially to prevent browser event loop overload

## 2. Debounce/Save Race Conditions

**Problem:** Test fails intermittently when waiting for workflow saves, or hangs
waiting for a response that already completed.

**Root Cause:** E2E tests run with `N8N_DEBOUNCE_MULTIPLIER=0`, making all
debounced operations immediate. With 0ms debounce, saves complete before the
response listener is set up.

**What happens:**
1. Test triggers action (e.g., close NDV)
2. With 0ms debounce, save fires immediately
3. Save completes before `waitForResponse()` is called
4. Test hangs waiting for a response that already happened

**Solution:** Use `withSaveWait()` pattern which sets up the listener BEFORE
the action:

```typescript
// ❌ Bad - race condition with 0ms debounce
await n8n.page.keyboard.press('Escape');
await n8n.canvas.waitForSaveWorkflowCompleted(); // May miss the response!

// ✅ Good - listener ready before action
await n8n.canvas.withSaveWait(async () => {
  await n8n.page.keyboard.press('Escape');
});
```

**For non-save waits:** Use `waitForDebounce()` which respects the multiplier:

```typescript
// ❌ Bad - hardcoded timeout
await n8n.page.waitForTimeout(150);

// ✅ Good - returns immediately in tests (multiplier=0)
await n8n.waitForDebounce(150);
```
