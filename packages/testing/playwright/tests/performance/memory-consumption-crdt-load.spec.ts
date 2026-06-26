import { WebSocket } from 'ws';
import * as yjs from 'yjs';

import { N8N_AUTH_COOKIE } from '../../config/constants';
import { test, expect } from '../../fixtures/base';
import { attachMetric, getStableHeap } from '../../utils/performance-helper';

/**
 * Per-active-session memory cost of server-side CRDT collaboration.
 *
 * The idle baseline (memory-consumption-crdt.spec.ts) captures the fixed boot
 * cost; this measures what the idle suite cannot — the per-room runtime cost.
 * It opens one authenticated editing session per workflow against
 * `/{rest}/crdt` (each spins up a server-side `Y.Doc` room), populates the room
 * with a realistic workflow, and reports the server heap growth per room.
 *
 * Raw WebSocket clients (not browser pages) are used deliberately: they isolate
 * the SERVER's per-room cost without the test process's frontend memory
 * confounding the reading.
 */
test.use({
	capability: {
		services: ['victoriaLogs', 'victoriaMetrics', 'vector'],
		env: { N8N_COLLABORATION_CRDT: 'server' },
	},
});

// Mirror of @n8n/crdt's document-sync wire protocol. Inlined because @n8n/crdt
// is not resolvable from this package; the frame-type bytes are a locked
// contract (see @n8n/crdt protocol.test.ts) so duplicating them here is safe.
const SYNC_STEP1 = 0;
const SYNC_UPDATE = 2;
function encodeMessage(type: number, payload: Uint8Array): Uint8Array {
	const framed = new Uint8Array(1 + payload.length);
	framed[0] = type;
	framed.set(payload, 1);
	return framed;
}

const ROOM_COUNT = 50;
const NODES_PER_WORKFLOW = 40;

/** Full-state update for a synthetic workflow matching the editor's CRDT mirror shape. */
function workflowStateUpdate(nodeCount: number): Uint8Array {
	const doc = new yjs.Doc();
	const nodes = doc.getMap('nodes');
	const connections = doc.getMap('connections');
	doc.transact(() => {
		for (let i = 0; i < nodeCount; i++) {
			nodes.set(`node-${i}`, {
				id: `node-${i}`,
				name: `Node ${i}`,
				type: 'n8n-nodes-base.set',
				typeVersion: 3,
				position: [i * 200, (i % 6) * 120],
				parameters: { values: { fields: [{ name: 'field', value: 'sample' }] } },
			});
		}
		for (let i = 0; i < nodeCount - 1; i++) {
			connections.set(`Node ${i}`, { main: [[{ node: `Node ${i + 1}`, type: 'main', index: 0 }]] });
		}
	});
	return yjs.encodeStateAsUpdate(doc);
}

test.describe(
	'Module Memory Impact · crdt-load @capability:observability',
	{ annotation: [{ type: 'owner', description: 'Collaboration' }] },
	() => {
		test(`Active sessions (${ROOM_COUNT} rooms) · crdt-load`, async ({
			n8nContainer,
			services,
			api,
		}, testInfo) => {
			const baseUrl = n8nContainer.baseUrl;
			const metrics = services.observability.metrics;

			// The /{rest}/crdt upgrade carries only the auth cookie (it is exempt from
			// the browser-id check, like /{rest}/push), so the owner's session cookie
			// is enough to authenticate each raw WebSocket.
			const { cookies } = await api.request.storageState();
			const authCookie = cookies.find((cookie) => cookie.name === N8N_AUTH_COOKIE);
			expect(authCookie, 'expected an authenticated owner session').toBeTruthy();
			const cookieHeader = `${N8N_AUTH_COOKIE}=${authCookie!.value}`;

			// One persisted workflow per room (the room is authorized against it).
			const workflowIds = await Promise.all(
				Array.from({ length: ROOM_COUNT }, async (_, i) => {
					const workflow = await api.workflows.createWorkflow({
						name: `crdt-load-${i}`,
						nodes: [],
						connections: {},
						settings: {},
					});
					return workflow.id as string;
				}),
			);

			// Baseline: server mode booted, but no rooms yet (yjs lazy-loads on the
			// first connection).
			const before = await getStableHeap(baseUrl, metrics);

			const wsBase = baseUrl.replace(/^http/, 'ws');
			const stateUpdate = workflowStateUpdate(NODES_PER_WORKFLOW);
			const emptyStateVector = yjs.encodeStateVector(new yjs.Doc());

			const sockets: WebSocket[] = [];
			await Promise.all(
				workflowIds.map(
					async (workflowId) =>
						await new Promise<void>((resolve, reject) => {
							const ws = new WebSocket(
								`${wsBase}/rest/crdt?workflowId=${workflowId}&version=latest`,
								{ headers: { Cookie: cookieHeader } },
							);
							sockets.push(ws);
							const timer = setTimeout(
								() => reject(new Error(`CRDT connect timed out for ${workflowId}`)),
								20_000,
							);
							ws.on('open', () => {
								// Handshake, then populate the room with a realistic workflow.
								ws.send(encodeMessage(SYNC_STEP1, emptyStateVector));
								ws.send(encodeMessage(SYNC_UPDATE, stateUpdate));
							});
							// The first server reply means the room is established and syncing.
							ws.on('message', () => {
								clearTimeout(timer);
								resolve();
							});
							ws.on('error', (error) => {
								clearTimeout(timer);
								reject(error);
							});
						}),
				),
			);

			// Measure once the server has settled with all rooms live.
			const after = await getStableHeap(baseUrl, metrics);

			const deltaMB = after.heapUsedMB - before.heapUsedMB;
			const perRoomMB = deltaMB / ROOM_COUNT;

			await attachMetric(testInfo, 'crdt-load-heap-used-before', before.heapUsedMB, 'MB');
			await attachMetric(testInfo, 'crdt-load-heap-used-after', after.heapUsedMB, 'MB');
			await attachMetric(testInfo, `crdt-load-heap-delta-${ROOM_COUNT}-rooms`, deltaMB, 'MB');
			await attachMetric(testInfo, 'crdt-load-heap-per-room', perRoomMB, 'MB');

			console.log(
				`[CRDT LOAD] ${ROOM_COUNT} rooms (${NODES_PER_WORKFLOW} nodes each): ` +
					`heap ${before.heapUsedMB.toFixed(1)} -> ${after.heapUsedMB.toFixed(1)} MB ` +
					`(Δ ${deltaMB.toFixed(1)} MB, ~${(perRoomMB * 1024).toFixed(0)} KB/room)`,
			);

			expect(after.heapUsedMB).toBeGreaterThan(before.heapUsedMB);

			for (const ws of sockets) ws.close();
		});
	},
);
