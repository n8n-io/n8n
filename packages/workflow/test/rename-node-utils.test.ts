import { mockFn } from 'vitest-mock-extended';

import type { INode } from '../src/index';
import { renameFormFields } from '../src/node-parameters/rename-node-utils';

const makeNode = (formFieldValues: Array<Record<string, unknown>>) =>
	({
		parameters: {
			formFields: {
				values: formFieldValues,
			},
		},
	}) as unknown as INode;

const mockMapping = mockFn();

describe('renameFormFields', () => {
	beforeEach(() => {
		mockMapping.mockReset();
	});
	it.each([
		{ parameters: {} },
		{ parameters: { otherField: null } },
		{ parameters: { formFields: 'a' } },
		{ parameters: { formFields: { values: 3 } } },
		{ parameters: { formFields: { values: { newKey: true } } } },
		{ parameters: { formFields: { values: [] } } },
		{ parameters: { formFields: { values: [{ fieldType: 'json' }] } } },
		{ parameters: { formFields: { values: [{ fieldType: 'html' }] } } },
	] as unknown as INode[])('should not modify %s without formFields.values parameters', (node) => {
		renameFormFields(node, mockMapping);
		expect(mockMapping).not.toBeCalled();
	});

	it('should rename fields based on the provided mapping', () => {
		const node = makeNode([{ fieldType: 'html', html: 'some text' }]);

		renameFormFields(node, mockMapping);
		expect(mockMapping).toBeCalledWith('some text');
	});

	it('should rename multiple fields', () => {
		const node = makeNode([
			{ fieldType: 'html', html: 'some text' },
			{ fieldType: 'html', html: 'some text' },
			{ fieldType: 'html', html: 'some text' },
			{ fieldType: 'html', html: 'some text' },
			{ fieldType: 'html', html: 'some text' },
		]);

		renameFormFields(node, mockMapping);
		expect(mockMapping).toBeCalledTimes(5);
	});
});
