import { runMemoryBaseline } from './memory-baseline';
import { test } from '../../fixtures/base';

// Boots with server-side CRDT collaboration enabled. Because yjs/y-protocols are
// lazy-loaded on the first editing connection (not at boot), this idle baseline
// captures only the fixed wiring cost of enabling the feature — it should sit
// close to the plain idle baseline, and guards against the heavy modules
// regressing back to an eager boot-time import. Per-active-session cost (the
// per-room Y.Doc) is not exercised here; that needs a connect-N-clients load run.
test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: {
			N8N_COLLABORATION_CRDT: 'server',
		},
	},
});

runMemoryBaseline({ name: 'crdt-server', owner: 'Collaboration' });
