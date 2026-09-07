/**
 * Standalone hook registry for manually demoing declarative webhook triggers.
 *
 *   pnpm --filter=n8n-playwright hook-registry          # port 9090
 *   PORT=9999 pnpm --filter=n8n-playwright hook-registry
 *
 * Point an E2E Test Declarative Webhook Trigger's URL parameter at it
 * (http://localhost:9090), activate the workflow, then deliver events:
 *
 *   curl -s localhost:9090/fire -H 'content-type: application/json' \
 *     -d '{"event":"created","name":"demo"}'
 */
import { HookRegistryServer } from '../services/hook-registry-server';

const port = Number(process.env.PORT ?? 9090);

// eslint-disable-next-line no-console
void new HookRegistryServer((line) => console.log(`[hook-registry] ${line}`)).start(port);
