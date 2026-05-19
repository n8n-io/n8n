import { RUNTIME_ONLY_NODE_FIELDS } from '../../src/serialization/workflow.schema';
import {
	SerializableNodeSchema,
	SerializableWorkflowSchema,
} from '../../src/serialization/workflow.schema';

describe('SerializableNodeSchema', () => {
	const validNode = {
		id: 'n1',
		name: 'Start',
		type: 'n8n-nodes-base.manualTrigger',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	};

	it('parses a minimal valid node', () => {
		expect(SerializableNodeSchema.parse(validNode)).toEqual(validNode);
	});

	it('strips every field listed in RUNTIME_ONLY_NODE_FIELDS', () => {
		const runtimeFields = {
			extendsCredential: 'someCred',
			rewireOutputLogTo: 'main',
			forceCustomOperation: { resource: 'r', operation: 'o' },
		};
		const result = SerializableNodeSchema.parse({ ...validNode, ...runtimeFields });
		for (const field of RUNTIME_ONLY_NODE_FIELDS) {
			expect(result).not.toHaveProperty(field);
		}
	});

	it('preserves serializable optional fields', () => {
		const result = SerializableNodeSchema.parse({
			...validNode,
			disabled: true,
			notes: 'a note',
			retryOnFail: true,
			maxTries: 3,
			onError: 'continueRegularOutput',
			credentials: { httpBasicAuth: { id: 'c1', name: 'My Cred' } },
			webhookId: 'wh-1',
		});
		expect(result.disabled).toBe(true);
		expect(result.notes).toBe('a note');
		expect(result.retryOnFail).toBe(true);
		expect(result.maxTries).toBe(3);
		expect(result.onError).toBe('continueRegularOutput');
		expect(result.credentials).toEqual({ httpBasicAuth: { id: 'c1', name: 'My Cred' } });
		expect(result.webhookId).toBe('wh-1');
	});

	it('keeps parameters opaque (passes through nested structure)', () => {
		const parameters = {
			whatever: { nested: { deep: 'value' } },
			n: 42,
			arr: [1, 2, 3],
			str: 'hello',
		};
		const result = SerializableNodeSchema.parse({ ...validNode, parameters });
		expect(result.parameters).toEqual(parameters);
	});

	it('rejects nodes missing required fields', () => {
		expect(() => SerializableNodeSchema.parse({ id: 'n1' })).toThrow();
		expect(() => SerializableNodeSchema.parse({ ...validNode, position: [0] })).toThrow();
		expect(() => SerializableNodeSchema.parse({ ...validNode, typeVersion: 'one' })).toThrow();
	});

	it('rejects unknown onError values', () => {
		expect(() => SerializableNodeSchema.parse({ ...validNode, onError: 'banana' })).toThrow();
	});
});

describe('SerializableWorkflowSchema', () => {
	const validWorkflow = {
		id: 'w1',
		name: 'My Workflow',
		nodes: [],
		connections: {},
		versionId: 'v-1',
		parentFolderId: null,
		active: false,
		isArchived: false,
	};

	it('parses a minimal valid workflow', () => {
		expect(SerializableWorkflowSchema.parse(validWorkflow)).toEqual(validWorkflow);
	});

	it('accepts optional settings as an opaque record', () => {
		const result = SerializableWorkflowSchema.parse({
			...validWorkflow,
			settings: { executionOrder: 'v1', timezone: 'UTC', custom: { nested: true } },
		});
		expect(result.settings).toEqual({
			executionOrder: 'v1',
			timezone: 'UTC',
			custom: { nested: true },
		});
	});

	it('accepts a non-null parentFolderId', () => {
		expect(
			SerializableWorkflowSchema.parse({ ...validWorkflow, parentFolderId: 'folder-1' })
				.parentFolderId,
		).toBe('folder-1');
	});

	it('rejects workflow missing required envelope fields', () => {
		expect(() => SerializableWorkflowSchema.parse({ id: 'w1' })).toThrow();
	});

	it('validates nested nodes against SerializableNodeSchema', () => {
		const badNode = { id: 'n1', name: 'X' };
		expect(() =>
			SerializableWorkflowSchema.parse({ ...validWorkflow, nodes: [badNode] }),
		).toThrow();
	});
});
