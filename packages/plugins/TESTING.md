# Plugin System Testing Guide

This guide explains how to test the plugin system, particularly feature flag toggling.

## Testing Feature Flag Toggling

### Setup

1. **Build the plugin**:
   ```bash
   cd packages/plugins/hello-world
   pnpm build
   ```

2. **Regenerate the plugin registry**:
   ```bash
   cd packages/frontend/editor-ui
   node scripts/generate-plugin-registry.mjs
   ```

3. **Start n8n in development mode**:
   ```bash
   pnpm dev
   ```

### Test Scenarios

#### Scenario 1: Plugin Loads When Feature Flag is Enabled

1. Open browser console (F12)
2. Enable the feature flag:
   ```javascript
   window.featureFlags.override('hello-world-plugin', true)
   ```
3. Reload the page
4. Check console output - should see:
   ```
   [hello-world] Feature flag check: { flag: 'hello-world-plugin', enabled: true }
   🔌 Loading 1 plugin(s)...
   ✓ Loaded plugin: @n8n/plugin-hello-world [internal]
   🔌 1/1 plugin(s) active
   ```
5. Navigate to Workflows view
6. **Expected**: Hello World component appears in the header (before and after)

#### Scenario 2: Plugin Doesn't Load When Feature Flag is Disabled

1. Open browser console (F12)
2. Disable the feature flag:
   ```javascript
   window.featureFlags.override('hello-world-plugin', false)
   ```
3. Reload the page
4. Check console output - should see:
   ```
   [hello-world] Feature flag check: { flag: 'hello-world-plugin', enabled: false }
   🔌 Loading 1 plugin(s)...
   ⊘ Plugin @n8n/plugin-hello-world load condition not met, skipping
   🔌 0/1 plugin(s) active
   ```
5. Navigate to Workflows view
6. **Expected**: Hello World component does NOT appear

#### Scenario 3: Dynamic Reload When Feature Flag Changes

1. Load the page with feature flag disabled (plugin not loaded)
2. Enable the feature flag:
   ```javascript
   window.featureFlags.override('hello-world-plugin', true)
   ```
3. Trigger plugin reload (if reload API is exposed):
   ```javascript
   // Note: This API may need to be exposed in a dev-only global
   // For now, page reload is required
   location.reload()
   ```
4. **Expected**: Plugin loads after reload

### Verifying Plugin Behavior

**Plugin is loaded when:**
- Console shows: `✓ Loaded plugin: @n8n/plugin-hello-world`
- Component appears in UI at extension points
- Extension point registry has the plugin registered

**Plugin is not loaded when:**
- Console shows: `⊘ Plugin ... load condition not met, skipping`
- Component does NOT appear in UI
- Active plugin count is 0

### Testing with PostHog (Production)

When PostHog is properly initialized:

1. Feature flags are evaluated server-side and passed to client
2. Plugin loader checks `posthog.isFeatureEnabled('hello-world-plugin')`
3. No override needed - uses actual PostHog flag state

### Debug Logging

Enable debug logging to see detailed plugin loading flow:

```javascript
// In browser console
localStorage.debug = '*'
```

This will show:
- Feature flag evaluation results
- Plugin load decisions
- Extension point registrations
- Store access patterns

## Testing Custom shouldLoad Conditions

Example: Load plugin only for trial users with a specific variant

```typescript
// packages/plugins/my-plugin/src/frontend/index.ts
export async function shouldLoad(context: LoadContext): Promise<boolean> {
  try {
    // Await store accessors (they're async)
    const posthog = await context.posthog();
    const cloudPlan = await context.cloudPlan();

    // Combine multiple conditions
    const flagVariant = posthog.getVariant('my-feature');
    const isTrialing = cloudPlan.userIsTrialing;

    console.log('[my-plugin] Load conditions:', {
      flagVariant,
      isTrialing,
      shouldLoad: flagVariant === 'variant1' && isTrialing,
    });

    return flagVariant === 'variant1' && isTrialing;
  } catch (error) {
    console.error('[my-plugin] Error in shouldLoad:', error);
    return false;
  }
}
```

**Important**: `shouldLoad` must be async and await all store accessors!

**Test steps:**
1. Mock trial state: Modify `cloudPlan.store.ts` to return `userIsTrialing: true`
2. Set feature flag variant: `window.featureFlags.override('my-feature', 'variant1')`
3. Reload and verify plugin loads
4. Change variant: `window.featureFlags.override('my-feature', 'variant2')`
5. Reload and verify plugin does NOT load

## Common Issues

### Issue: Plugin not loading even with flag enabled

**Possible causes:**
1. Plugin build failed - check `dist/frontend/index.js` exists
2. Registry not regenerated - run `generate-plugin-registry.mjs`
3. shouldLoad function has error - check browser console
4. Import error - check network tab for 404s

**Debug:**
```javascript
// Check what's in the registry
import { PLUGINS } from '@/plugins/registry.generated'
console.log(PLUGINS)

// Check loaded plugins
import { getPluginLoader } from '@/plugins/loader'
console.log(getPluginLoader()?.getActivePlugins())
```

### Issue: Feature flag override not working

**Solution:**
- Clear localStorage: `localStorage.clear()`
- Verify override: `console.log(window.featureFlags.getAll())`
- Check PostHog initialization: `console.log(window.posthog)`

### Issue: shouldLoad throws error

**Debug:**
```javascript
// Test shouldLoad directly (async version)
const ctx = {
  posthog: async () => (await import('@/stores/posthog.store')).usePostHog(),
  cloudPlan: async () => (await import('@/stores/cloudPlan.store')).useCloudPlanStore(),
  workflows: async () => (await import('@/stores/workflows.store')).useWorkflowsStore(),
  users: async () => (await import('@/stores/users.store')).useUsersStore(),
};

const module = await import('@n8n/plugin-hello-world/frontend/index.js');
const result = await module.shouldLoad(ctx);
console.log('shouldLoad result:', result);
```

## Success Criteria

- ✅ Plugin loads when feature flag is enabled
- ✅ Plugin doesn't load when feature flag is disabled
- ✅ Console logs show correct feature flag evaluation
- ✅ UI reflects plugin state (components appear/disappear)
- ✅ No errors in console
- ✅ Custom shouldLoad conditions work correctly
- ✅ Multiple store conditions can be combined
