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
});
