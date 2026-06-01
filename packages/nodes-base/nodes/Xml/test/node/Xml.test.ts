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

		test.each(FORBIDDEN_KEYS)(
			'should reject non-string attrkey that resolves to "%s"',
			async (forbiddenKey) => {
				setupGetNodeParameter('xmlToJson', { attrkey: [forbiddenKey], mergeAttrs: false });

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

		test.each(FORBIDDEN_KEYS)(
			'should reject non-string charkey that resolves to "%s"',
			async (forbiddenKey) => {
				setupGetNodeParameter('xmlToJson', { charkey: [forbiddenKey] });

				await expect(xmlNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					`The "Character Key" option value "${forbiddenKey}" is not allowed`,
				);
				await expect(xmlNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			},
		);
	});

	describe('default option behaviour', () => {
		test('should use the parser default attribute key when attrkey option is not set', async () => {
			setupGetNodeParameter('xmlToJson', { mergeAttrs: false, explicitArray: false });
			mockExecuteFunctions.getInputData.mockReturnValue([
				{ json: { data: '<root foo="bar">x</root>' } },
			]);

			const result = await xmlNode.execute.call(mockExecuteFunctions);

			const parsed = result[0][0].json as { root: Record<string, unknown> };
			expect(parsed.root).toHaveProperty('$', { foo: 'bar' });
		});

		test('should use the parser default character key when charkey option is not set', async () => {
			setupGetNodeParameter('xmlToJson', { mergeAttrs: false, explicitArray: false });
			mockExecuteFunctions.getInputData.mockReturnValue([
				{ json: { data: '<root foo="bar">text</root>' } },
			]);

			const result = await xmlNode.execute.call(mockExecuteFunctions);

			const parsed = result[0][0].json as { root: Record<string, unknown> };
			expect(parsed.root).toHaveProperty('_', 'text');
		});
	});

	describe('attrkey and charkey are coerced to a stable string', () => {
		test('should forward the coerced attrkey string to the parser in xmlToJson mode', async () => {
			const statefulAttrkey = (() => {
				let calls = 0;
				return {
					toString: () => (++calls === 1 ? 'safe' : 'changed'),
				};
			})();

			setupGetNodeParameter('xmlToJson', {
				attrkey: statefulAttrkey,
				mergeAttrs: false,
				explicitArray: false,
			});
			mockExecuteFunctions.getInputData.mockReturnValue([
				{ json: { data: '<root foo="bar">x</root>' } },
			]);

			const result = await xmlNode.execute.call(mockExecuteFunctions);

			const parsed = result[0][0].json as { root: Record<string, unknown> };
			expect(parsed.root).toHaveProperty('safe', { foo: 'bar' });
			expect(parsed.root).not.toHaveProperty('changed');
		});

		test('should forward the coerced charkey string to the parser in xmlToJson mode', async () => {
			const statefulCharkey = (() => {
				let calls = 0;
				return {
					toString: () => (++calls === 1 ? 'safe' : 'changed'),
				};
			})();

			setupGetNodeParameter('xmlToJson', {
				charkey: statefulCharkey,
				mergeAttrs: false,
				explicitArray: false,
			});
			mockExecuteFunctions.getInputData.mockReturnValue([
				{ json: { data: '<root foo="bar">text</root>' } },
			]);

			const result = await xmlNode.execute.call(mockExecuteFunctions);

			const parsed = result[0][0].json as { root: Record<string, unknown> };
			expect(parsed.root).toHaveProperty('safe', 'text');
			expect(parsed.root).not.toHaveProperty('changed');
		});

		test('should forward the coerced attrkey string to the builder in jsonToxml mode', async () => {
			const statefulAttrkey = (() => {
				let calls = 0;
				return {
					toString: () => (++calls === 1 ? 'safe' : 'changed'),
				};
			})();

			setupGetNodeParameter('jsonToxml', {
				attrkey: statefulAttrkey,
				headless: true,
			});
			mockExecuteFunctions.getInputData.mockReturnValue([
				{ json: { root: { safe: { foo: 'bar' } } } },
			]);

			const result = await xmlNode.execute.call(mockExecuteFunctions);

			const xml = (result[0][0].json as { data: string }).data;
			expect(xml).toContain('foo="bar"');
			expect(xml).not.toContain('<safe');
			expect(xml).not.toContain('<changed');
		});
	});
});
