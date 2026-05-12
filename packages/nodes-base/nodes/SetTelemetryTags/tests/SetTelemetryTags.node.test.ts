/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
/* eslint-disable n8n-nodes-base/node-param-display-name-miscased-id */
/* eslint-disable n8n-nodes-base/node-param-display-name-excess-inner-whitespace */
/* eslint-disable n8n-nodes-base/node-param-display-name-untrimmed */
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { SetTelemetryTags } from '../SetTelemetryTags.node';

type TagEntry = { name?: string; value?: unknown };

describe('SetTelemetryTags node', () => {
	function createExecuteFunctionsMock(options?: {
		tags?: TagEntry[];
		items?: INodeExecutionData[];
		continueOnFail?: boolean;
	}) {
		const { items = [{ json: {} }], tags = [], continueOnFail = false } = options ?? {};

		const setMetadata = jest.fn();
		const continueOnFailMock = jest.fn().mockReturnValue(continueOnFail);

		return {
			executeFunctions: mock<IExecuteFunctions>({
				getInputData: jest.fn().mockReturnValue(items),
				getNodeParameter: jest.fn().mockReturnValue({ tag: tags }),
				continueOnFail: continueOnFailMock,
				setMetadata,
				getNode: jest.fn().mockReturnValue({ name: 'SetTelemetryTags', type: 'setTelemetryTags' }),
			}),
			setMetadata,
			continueOnFail: continueOnFailMock,
			items,
		};
	}

	it('should be defined', () => {
		expect(SetTelemetryTags).toBeDefined();
	});

	it('should set metadata with a single tag', async () => {
		const node = new SetTelemetryTags();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock({
			tags: [{ name: 'customer.id', value: 'abc-123' }],
		});

		await node.execute.call(executeFunctions);

		expect(setMetadata).toHaveBeenCalledTimes(1);
		expect(setMetadata).toHaveBeenCalledWith({
			tracing: { 'customer.id': 'abc-123' },
		});
	});

	it('should set metadata with multiple tags in a single call', async () => {
		const node = new SetTelemetryTags();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock({
			tags: [
				{ name: 'customer.id', value: 'abc-123' },
				{ name: 'region', value: 'eu-west' },
			],
		});

		await node.execute.call(executeFunctions);

		expect(setMetadata).toHaveBeenCalledTimes(1);
		expect(setMetadata).toHaveBeenCalledWith({
			tracing: { 'customer.id': 'abc-123', region: 'eu-west' },
		});
	});

	it('should coerce non-string values to strings', async () => {
		const node = new SetTelemetryTags();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock({
			tags: [
				{ name: 'count', value: 42 },
				{ name: 'enabled', value: true },
			],
		});

		await node.execute.call(executeFunctions);

		expect(setMetadata).toHaveBeenCalledWith({
			tracing: { count: '42', enabled: 'true' },
		});
	});

	it('should skip tags with empty or whitespace-only names', async () => {
		const node = new SetTelemetryTags();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock({
			tags: [
				{ name: '', value: 'ignored' },
				{ name: '   ', value: 'also-ignored' },
				{ name: 'kept', value: 'yes' },
			],
		});

		await node.execute.call(executeFunctions);

		expect(setMetadata).toHaveBeenCalledWith({
			tracing: { kept: 'yes' },
		});
	});

	it('should skip tags with undefined or null values', async () => {
		const node = new SetTelemetryTags();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock({
			tags: [
				{ name: 'missing', value: undefined },
				{ name: 'nulled', value: null },
				{ name: 'present', value: 'yes' },
			],
		});

		await node.execute.call(executeFunctions);

		expect(setMetadata).toHaveBeenCalledWith({
			tracing: { present: 'yes' },
		});
	});

	it('should not call setMetadata when no valid tags are provided', async () => {
		const node = new SetTelemetryTags();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock({
			tags: [],
		});

		await node.execute.call(executeFunctions);

		expect(setMetadata).not.toHaveBeenCalled();
	});

	it('should pass items through unchanged', async () => {
		const node = new SetTelemetryTags();

		const inputItems = [{ json: { a: 1 } }, { json: { b: 2 } }];
		const { executeFunctions } = createExecuteFunctionsMock({
			tags: [{ name: 'key', value: 'value' }],
			items: inputItems,
		});

		const result = await node.execute.call(executeFunctions);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe(inputItems);
		expect(result[0]).toHaveLength(2);
	});

	it('should continue on fail when setMetadata throws and continueOnFail is enabled', async () => {
		const node = new SetTelemetryTags();

		const { executeFunctions, setMetadata, continueOnFail } = createExecuteFunctionsMock({
			tags: [{ name: 'key', value: 'value' }],
			continueOnFail: true,
		});
		setMetadata.mockImplementationOnce(() => {
			throw new Error('Test error');
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toHaveLength(1);
		expect(continueOnFail).toHaveBeenCalled();
	});

	it('should rethrow when setMetadata throws and continueOnFail is disabled', async () => {
		const node = new SetTelemetryTags();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock({
			tags: [{ name: 'key', value: 'value' }],
			continueOnFail: false,
		});
		setMetadata.mockImplementationOnce(() => {
			throw new Error('Test error');
		});

		await expect(node.execute.call(executeFunctions)).rejects.toThrow('Test error');
	});
});
