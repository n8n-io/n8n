import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { Xml } from '../../Xml.node';

describe('Test XML Node', () => {
	new NodeTestHarness().setupTests();
});

describe('Xml Node - options validation', () => {
	const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

	let xmlNode: Xml;
	let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	beforeEach(() => {
		xmlNode = new Xml();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'xml-node',
			name: 'XML',
			type: 'n8n-nodes-base.xml',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		mockExecuteFunctions.getInputData.mockReturnValue([
			{ json: { data: '<root foo="bar">x</root>' } },
		]);
	});

	const setupGetNodeParameter = (mode: string, options: Record<string, unknown>) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(parameterName: string, _itemIndex: number, fallbackValue?: unknown) => {
				if (parameterName === 'mode') return mode;
				if (parameterName === 'dataPropertyName') return 'data';
				if (parameterName === 'options') return options;
				return fallbackValue as object;
			},
		);
	};

	describe('attrkey validation', () => {
		test.each(FORBIDDEN_KEYS)(
			'should reject invalid attrkey "%s" in xmlToJson mode',
			async (forbiddenKey) => {
				setupGetNodeParameter('xmlToJson', { attrkey: forbiddenKey, mergeAttrs: false });

				await expect(xmlNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					`The "Attribute Key" option value "${forbiddenKey}" is not allowed`,
				);
				await expect(xmlNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			},
		);

		test.each(FORBIDDEN_KEYS)(
			'should reject invalid attrkey "%s" in jsonToxml mode',
			async (forbiddenKey) => {
				setupGetNodeParameter('jsonToxml', { attrkey: forbiddenKey });

				await expect(xmlNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					`The "Attribute Key" option value "${forbiddenKey}" is not allowed`,
				);
				await expect(xmlNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			},
		);
	});

	describe('charkey validation', () => {
		test.each(FORBIDDEN_KEYS)(
			'should reject invalid charkey "%s" in xmlToJson mode',
			async (forbiddenKey) => {
				setupGetNodeParameter('xmlToJson', { charkey: forbiddenKey });

				await expect(xmlNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					`The "Character Key" option value "${forbiddenKey}" is not allowed`,
				);
				await expect(xmlNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			},
		);

		test.each(FORBIDDEN_KEYS)(
			'should reject invalid charkey "%s" in jsonToxml mode',
			async (forbiddenKey) => {
				setupGetNodeParameter('jsonToxml', { charkey: forbiddenKey });

				await expect(xmlNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					`The "Character Key" option value "${forbiddenKey}" is not allowed`,
				);
				await expect(xmlNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			},
		);
	});
});
