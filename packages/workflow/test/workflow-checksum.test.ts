import { vi } from 'vitest';

import type { INode } from '../src/interfaces';
import { calculateWorkflowChecksum, type WorkflowSnapshot } from '../src/workflow-checksum';

describe('calculateWorkflowChecksum', () => {
	const baseWorkflow: WorkflowSnapshot = {
		name: 'Test Workflow',
		nodes: [
			{
				id: 'node1',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},
		],
		connections: {},
		settings: {
			executionOrder: 'v1',
			timezone: 'America/New_York',
		},
	};

	it('should generate the same checksum for identical workflows', async () => {
		const checksum1 = await calculateWorkflowChecksum(baseWorkflow);
		const checksum2 = await calculateWorkflowChecksum(baseWorkflow);

		expect(checksum1).toBe(checksum2);
	});

	it('should generate different checksums when a setting changes', async () => {
		const workflow1: WorkflowSnapshot = {
			...baseWorkflow,
			settings: {
				executionOrder: 'v1',
				timezone: 'America/New_York',
			},
		};

		const workflow2: WorkflowSnapshot = {
			...baseWorkflow,
			settings: {
				executionOrder: 'v1',
				timezone: 'Europe/London',
			},
		};

		const checksum1 = await calculateWorkflowChecksum(workflow1);
		const checksum2 = await calculateWorkflowChecksum(workflow2);

		expect(checksum1).not.toBe(checksum2);
	});

	it('should generate different checksums when a setting is added', async () => {
		const workflow1: WorkflowSnapshot = {
			...baseWorkflow,
			settings: {
				executionOrder: 'v1',
			},
		};

		const workflow2: WorkflowSnapshot = {
			...baseWorkflow,
			settings: {
				executionOrder: 'v1',
				timezone: 'America/New_York',
			},
		};

		const checksum1 = await calculateWorkflowChecksum(workflow1);
		const checksum2 = await calculateWorkflowChecksum(workflow2);

		expect(checksum1).not.toBe(checksum2);
	});

	it('should generate different checksums when a setting is removed', async () => {
		const workflow1: WorkflowSnapshot = {
			...baseWorkflow,
			settings: {
				executionOrder: 'v1',
				timezone: 'America/New_York',
			},
		};

		const workflow2: WorkflowSnapshot = {
			...baseWorkflow,
			settings: {
				executionOrder: 'v1',
			},
		};

		const checksum1 = await calculateWorkflowChecksum(workflow1);
		const checksum2 = await calculateWorkflowChecksum(workflow2);

		expect(checksum1).not.toBe(checksum2);
	});

	it('should generate same checksum when a setting is undefined i.e. missing', async () => {
		const workflow1: WorkflowSnapshot = {
			...baseWorkflow,
			settings: {
				executionOrder: 'v1',
				timezone: undefined,
			},
		};

		const workflow2: WorkflowSnapshot = {
			...baseWorkflow,
			settings: {
				executionOrder: 'v1',
			},
		};

		const checksum1 = await calculateWorkflowChecksum(workflow1);
		const checksum2 = await calculateWorkflowChecksum(workflow2);

		// undefined fields should be ignored, so checksums should be the same
		expect(checksum1).toBe(checksum2);
	});

	it('should handle complex nested metadata', async () => {
		const workflow1: WorkflowSnapshot = {
			...baseWorkflow,
			meta: {
				nested: {
					foo: 'bar',
					baz: 123,
				},
			},
		};

		const workflow2: WorkflowSnapshot = {
			...baseWorkflow,
			meta: {
				nested: {
					foo: 'bar',
					baz: 456, // Changed
				},
			},
		};

		const checksum1 = await calculateWorkflowChecksum(workflow1);
		const checksum2 = await calculateWorkflowChecksum(workflow2);

		expect(checksum1).not.toBe(checksum2);
	});

	it('should generate different checksums when nodeGroups change', async () => {
		const workflow1: WorkflowSnapshot = {
			...baseWorkflow,
			nodeGroups: [{ id: 'group1', name: 'Group A', nodeIds: ['node1'] }],
		};

		const workflow2: WorkflowSnapshot = {
			...baseWorkflow,
			nodeGroups: [{ id: 'group1', name: 'Group B', nodeIds: ['node1'] }],
		};

		const checksum1 = await calculateWorkflowChecksum(workflow1);
		const checksum2 = await calculateWorkflowChecksum(workflow2);

		expect(checksum1).not.toBe(checksum2);
	});

	it('should generate different checksums when nodeGroups are added', async () => {
		const workflow1: WorkflowSnapshot = {
			...baseWorkflow,
			nodeGroups: [],
		};

		const workflow2: WorkflowSnapshot = {
			...baseWorkflow,
			nodeGroups: [{ id: 'group1', name: 'Group A', nodeIds: ['node1'] }],
		};

		const checksum1 = await calculateWorkflowChecksum(workflow1);
		const checksum2 = await calculateWorkflowChecksum(workflow2);

		expect(checksum1).not.toBe(checksum2);
	});

	it('should generate the same checksum when object keys are in different insertion order', async () => {
		const workflow1: WorkflowSnapshot = {
			name: 'Test Workflow',
			settings: {
				executionOrder: 'v1',
				timezone: 'America/New_York',
			},
			meta: {
				nested: { foo: 'bar', baz: 'qux' },
			},
		};

		const workflow2: WorkflowSnapshot = {
			meta: {
				nested: { baz: 'qux', foo: 'bar' },
			},
			settings: {
				timezone: 'America/New_York',
				executionOrder: 'v1',
			},
			name: 'Test Workflow',
		};

		const checksum1 = await calculateWorkflowChecksum(workflow1);
		const checksum2 = await calculateWorkflowChecksum(workflow2);

		expect(checksum1).toBe(checksum2);
	});

	it('should return a 64-character lowercase hex string matching a pinned reference hash', async () => {
		const canonicalWorkflow: WorkflowSnapshot = {
			name: 'Canonical',
			nodes: [],
			connections: {},
		};

		const checksum = await calculateWorkflowChecksum(canonicalWorkflow);

		expect(checksum).toMatch(/^[0-9a-f]{64}$/);
		expect(checksum).toBe('11020572b14a9e257c93b4c971cc6fd85e390305548f029e3277422fb5678e33');
	});

	it('should produce the same checksum via the jsSHA fallback as WebCrypto', async () => {
		const webCryptoChecksum = await calculateWorkflowChecksum(baseWorkflow);

		const originalCrypto = globalThis.crypto;
		Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
		try {
			const fallbackChecksum = await calculateWorkflowChecksum(baseWorkflow);
			expect(fallbackChecksum).toBe(webCryptoChecksum);
			expect(fallbackChecksum).toMatch(/^[0-9a-f]{64}$/);
		} finally {
			Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
		}
	});

	// Key-permutation invariance must hold *inside* arrays too — pins the
	// recursive normalisation of array elements.
	it('should produce the same checksum when keys are reordered inside array elements', async () => {
		const workflow1: WorkflowSnapshot = {
			...baseWorkflow,
			nodes: [
				{
					id: 'node1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [250, 300],
					parameters: { alpha: 1, beta: 2, gamma: { x: 'a', y: 'b' } },
				},
				{
					id: 'node2',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [500, 300],
					parameters: { foo: 'bar', baz: 'qux' },
				},
			],
		};

		const workflow2: WorkflowSnapshot = {
			...baseWorkflow,
			nodes: [
				{
					parameters: { gamma: { y: 'b', x: 'a' }, beta: 2, alpha: 1 },
					position: [250, 300],
					typeVersion: 1,
					type: 'n8n-nodes-base.manualTrigger',
					name: 'Start',
					id: 'node1',
				},
				{
					parameters: { baz: 'qux', foo: 'bar' },
					position: [500, 300],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					name: 'Set',
					id: 'node2',
				},
			],
		};

		const checksum1 = await calculateWorkflowChecksum(workflow1);
		const checksum2 = await calculateWorkflowChecksum(workflow2);

		expect(checksum1).toBe(checksum2);
	});

	// Arrays are ordered, not sets — swapping element positions must change
	// the checksum, even with recursive key normalisation.
	it('should generate different checksums when array element order differs', async () => {
		const nodeA: INode = {
			id: 'a',
			name: 'A',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const nodeB: INode = {
			id: 'b',
			name: 'B',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		const checksumAB = await calculateWorkflowChecksum({ ...baseWorkflow, nodes: [nodeA, nodeB] });
		const checksumBA = await calculateWorkflowChecksum({ ...baseWorkflow, nodes: [nodeB, nodeA] });

		expect(checksumAB).not.toBe(checksumBA);
	});

	// Non-plain objects (Date, Map, class instances) are passed through
	// opaquely — not descended into. If they were treated as plain objects,
	// `Object.keys(date)` would be empty and a Date would collide with `{}`.
	it('should treat non-plain objects in meta as opaque (distinct from empty object)', async () => {
		const dateWorkflow: WorkflowSnapshot = {
			...baseWorkflow,
			meta: { stamp: new Date('2025-01-15T00:00:00.000Z') },
		};
		const emptyWorkflow: WorkflowSnapshot = {
			...baseWorkflow,
			meta: { stamp: {} },
		};

		const dateChecksum = await calculateWorkflowChecksum(dateWorkflow);
		const emptyChecksum = await calculateWorkflowChecksum(emptyWorkflow);

		expect(dateChecksum).not.toBe(emptyChecksum);
	});

	// Two different Date instants must hash differently — they would both
	// collapse to `{}` if the recursive sort branch ran on them.
	it('should generate different checksums when a Date value in meta changes', async () => {
		const earlyWorkflow: WorkflowSnapshot = {
			...baseWorkflow,
			meta: { stamp: new Date('2025-01-15T00:00:00.000Z') },
		};
		const lateWorkflow: WorkflowSnapshot = {
			...baseWorkflow,
			meta: { stamp: new Date('2030-06-15T00:00:00.000Z') },
		};

		const earlyChecksum = await calculateWorkflowChecksum(earlyWorkflow);
		const lateChecksum = await calculateWorkflowChecksum(lateWorkflow);

		expect(earlyChecksum).not.toBe(lateChecksum);
	});

	// When WebCrypto is available, the implementation must call subtle.digest
	// — both fallback and webcrypto paths produce the same hash, so without
	// this spy the choice of branch is unobservable.
	it('should use the WebCrypto subtle.digest path when available', async () => {
		const subtle = globalThis.crypto?.subtle;
		if (!subtle) return;

		const digestSpy = vi.spyOn(subtle, 'digest');
		try {
			const checksum = await calculateWorkflowChecksum(baseWorkflow);
			expect(digestSpy).toHaveBeenCalledTimes(1);
			expect(digestSpy).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
			expect(checksum).toMatch(/^[0-9a-f]{64}$/);
		} finally {
			digestSpy.mockRestore();
		}
	});
});
