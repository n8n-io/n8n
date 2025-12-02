import { calculateWorkflowChecksum, type WorkflowSnapshot } from '../src/workflow-checksum';

describe('calculateWorkflowChecksum', () => {
	const baseWorkflow: WorkflowSnapshot = {
		name: 'Test Workflow',
		nodes: [
			{
				id: 'node1',
				name: 'Start',
				type: 'n8n-nodes-base.start',
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
});
