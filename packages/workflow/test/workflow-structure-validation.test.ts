import {
	safeParseWorkflowStructure,
	parseWorkflowStructure,
	WorkflowStructureValidationError,
} from '../src/workflow-structure-validation';

describe('workflow-structure-validation', () => {
	const validWorkflow = {
		nodes: [
			{
				id: 'node-1',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				position: [0, 0] as [number, number],
				parameters: {},
			},
			{
				id: 'node-2',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				position: [200, 0] as [number, number],
				parameters: {},
			},
		],
		connections: {
			Start: {
				main: [[{ node: 'Set', type: 'main', index: 0 }]],
			},
		},
	};

	test('accepts a structurally valid workflow', () => {
		expect(safeParseWorkflowStructure(validWorkflow)).toEqual({
			success: true,
			data: validWorkflow,
		});
	});

	test('accepts a valid workflow with empty connections', () => {
		const result = safeParseWorkflowStructure({
			nodes: [validWorkflow.nodes[0]],
			connections: {},
		});

		expect(result.success).toBe(true);
	});

	test('accepts a valid workflow with empty nodes array', () => {
		const result = safeParseWorkflowStructure({
			nodes: [],
			connections: {},
		});

		expect(result.success).toBe(true);
	});

	test('accepts null connection buckets (unused output slots)', () => {
		const result = safeParseWorkflowStructure({
			...validWorkflow,
			connections: {
				Start: {
					main: [null, [{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		});

		expect(result.success).toBe(true);
	});

	test('rejects nodes missing a required field', () => {
		const result = safeParseWorkflowStructure({
			...validWorkflow,
			nodes: [{ ...validWorkflow.nodes[0], type: undefined }],
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'invalid_type',
				path: ['nodes', 0, 'type'],
			}),
		);
	});

	test('rejects empty string node name', () => {
		const result = safeParseWorkflowStructure({
			...validWorkflow,
			nodes: [{ ...validWorkflow.nodes[0], name: '' }],
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'too_small',
				path: ['nodes', 0, 'name'],
			}),
		);
	});

	test('rejects positions with fewer than two coordinates', () => {
		const result = safeParseWorkflowStructure({
			...validWorkflow,
			nodes: [{ ...validWorkflow.nodes[0], position: [0] }],
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'too_small',
				path: ['nodes', 0, 'position'],
			}),
		);
	});

	test('rejects positions with more than two coordinates', () => {
		const result = safeParseWorkflowStructure({
			...validWorkflow,
			nodes: [{ ...validWorkflow.nodes[0], position: [0, 0, 50] }],
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'too_big',
				path: ['nodes', 0, 'position'],
			}),
		);
	});

	test('rejects connection with negative index', () => {
		const result = safeParseWorkflowStructure({
			...validWorkflow,
			connections: {
				Start: {
					main: [[{ node: 'Set', type: 'main', index: -1 }]],
				},
			},
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'too_small',
				path: ['connections', 'Start', 'main', 0, 0, 'index'],
			}),
		);
	});

	test('rejects duplicate node names', () => {
		const result = safeParseWorkflowStructure({
			...validWorkflow,
			nodes: [
				validWorkflow.nodes[0],
				{
					...validWorkflow.nodes[1],
					name: 'Start',
				},
			],
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'duplicate_node_name',
				path: ['nodes', 1, 'name'],
			}),
		);
	});

	test('rejects unknown connection sources', () => {
		const result = safeParseWorkflowStructure({
			...validWorkflow,
			connections: {
				Missing: {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'unknown_connection_source',
				path: ['connections', 'Missing'],
			}),
		);
	});

	test('rejects unknown connection targets', () => {
		const result = safeParseWorkflowStructure({
			...validWorkflow,
			connections: {
				Start: {
					main: [[{ node: 'Missing', type: 'main', index: 0 }]],
				},
			},
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'unknown_connection_target',
				path: ['connections', 'Start', 'main', 0, 0, 'node'],
			}),
		);
	});

	test('rejects empty nodes with non-empty connections', () => {
		const result = safeParseWorkflowStructure({
			nodes: [],
			connections: {
				Start: {
					main: [[{ node: 'Set', type: 'main', index: 0 }]],
				},
			},
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'unknown_connection_source',
			}),
		);
	});

	test('throws a typed error for invalid workflows', () => {
		expect(() =>
			parseWorkflowStructure({
				nodes: [{ name: 'Start', position: [0, 0], parameters: {} }],
				connections: {},
			}),
		).toThrow(WorkflowStructureValidationError);
	});

	test('error description formats issue paths', () => {
		let thrown: WorkflowStructureValidationError | undefined;

		try {
			parseWorkflowStructure({
				nodes: [{ name: 'Start', position: [0, 0], parameters: {} }],
				connections: {},
			});
		} catch (error) {
			thrown = error as WorkflowStructureValidationError;
		}

		expect(thrown).toBeInstanceOf(WorkflowStructureValidationError);
		expect(thrown?.description).toContain('nodes[0].type');
	});
});
