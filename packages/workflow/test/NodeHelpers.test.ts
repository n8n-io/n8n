import { describe, it, expect } from 'vitest';
import { getNodeInputs, getNodeOutputs } from '../src/NodeHelpers';

const mockWorkflow = {
	expression: {
		getSimpleParameterValue: (node: any, param: any) => {
			if (param === 'failInputs') {
				throw new Error('Input calculation failed');
			}
			if (param === 'failOutputs') {
				throw new Error('Output calculation failed');
			}
			if (param === 'dynamicInputs') {
				return ['main', 'secondary'];
			}
			if (param === 'dynamicOutputs') {
				return ['main', 'error'];
			}
			return [];
		},
	},
};

const mockNode = { name: 'TestNode', onError: undefined };

const mockNodeTypeWithStaticInputs = {
	inputs: ['main', 'secondary'],
	outputs: ['main', 'error'],
};

const mockNodeTypeWithDynamicInputs = {
	inputs: 'dynamicInputs',
	outputs: 'dynamicOutputs',
};

const mockNodeTypeWithFailInputs = {
	inputs: 'failInputs',
	outputs: 'failOutputs',
};

describe('getNodeInputs', () => {
	it('returns static inputs if inputs is an array', () => {
		const inputs = getNodeInputs(mockWorkflow as any, mockNode as any, mockNodeTypeWithStaticInputs as any);
		expect(inputs).toEqual(['main', 'secondary']);
	});

	it('returns dynamic inputs if inputs is not an array', () => {
		const inputs = getNodeInputs(mockWorkflow as any, mockNode as any, mockNodeTypeWithDynamicInputs as any);
		expect(inputs).toEqual(['main', 'secondary']);
	});

	it('throws error if dynamic input calculation fails', () => {
		expect(() => {
			getNodeInputs(mockWorkflow as any, mockNode as any, mockNodeTypeWithFailInputs as any);
		}).toThrowError('Failed to calculate inputs dynamically for node: TestNode. Error: Input calculation failed');
	});
});

describe('getNodeOutputs', () => {
	it('returns static outputs if outputs is an array', () => {
		const outputs = getNodeOutputs(mockWorkflow as any, mockNode as any, mockNodeTypeWithStaticInputs as any);
		expect(outputs).toEqual(['main', 'error']);
	});

	it('returns dynamic outputs if outputs is not an array', () => {
		const outputs = getNodeOutputs(mockWorkflow as any, mockNode as any, mockNodeTypeWithDynamicInputs as any);
		expect(outputs).toEqual(['main', 'error']);
	});

	it('throws error if dynamic output calculation fails', () => {
		expect(() => {
			getNodeOutputs(mockWorkflow as any, mockNode as any, mockNodeTypeWithFailInputs as any);
		}).toThrowError('Failed to calculate outputs dynamically for node: TestNode. Error: Output calculation failed');
	});

	it('adds error output when onError is continueErrorOutput', () => {
		const nodeWithErrorOutput = { ...mockNode, onError: 'continueErrorOutput' as const };
		const outputs = getNodeOutputs(mockWorkflow as any, nodeWithErrorOutput as any, mockNodeTypeWithStaticInputs as any);
		expect(outputs).toContainEqual({
			category: 'error',
			type: 'main',
			displayName: 'Error',
		});
	});
});
