import type { INode } from 'n8n-workflow';
import { validateInputData } from '../utils';
import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Test Remove Duplicates Node', () => testWorkflows(workflows));

describe('Test Remove Duplicates Node, validateInputData util', () => {
	test('Should throw error for version 1', () => {
		expect(() =>
			validateInputData(
				{
					name: 'Remove Duplicates',
					type: 'n8n-nodes-base.removeDuplicates',
					typeVersion: 1,
				} as INode,
				[
					{ json: { country: 'uk' } },
					{ json: { country: 'us' } },
					{ json: { country: 'uk' } },
					{ json: { country: null } },
				],
				['country'],
				false,
			),
		).toThrow("'country' isn't always the same type");
	});
	test('Should ignore null values and not throw error for version grater than 1', () => {
		expect(() =>
			validateInputData(
				{
					name: 'Remove Duplicates',
					type: 'n8n-nodes-base.removeDuplicates',
					typeVersion: 1.1,
				} as INode,
				[
					{ json: { country: 'uk' } },
					{ json: { country: 'us' } },
					{ json: { country: 'uk' } },
					{ json: { country: null } },
				],
				['country'],
				false,
			),
		).not.toThrow();
	});
	test('Should throw error for different types, version grater than 1', () => {
		expect(() =>
			validateInputData(
				{
					name: 'Remove Duplicates',
					type: 'n8n-nodes-base.removeDuplicates',
					typeVersion: 1.1,
				} as INode,
				[{ json: { id: 1 } }, { json: { id: '1' } }, { json: { id: 2 } }, { json: { id: null } }],
				['id'],
				false,
			),
		).toThrow("'id' isn't always the same type");
	});
});
