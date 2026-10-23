import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { GoogleFirebaseCloudFirestore } from '../GoogleFirebaseCloudFirestore.node';

describe('Firestore numeric request values', () => {
	const cases: Array<{ label: string; value: IDataObject[string]; encoded: IDataObject }> = [
		{ label: 'small positive fraction', value: 1e-7, encoded: { doubleValue: 1e-7 } },
		{ label: 'small negative fraction', value: -1e-7, encoded: { doubleValue: -1e-7 } },
		{
			label: 'smallest positive fraction',
			value: Number.MIN_VALUE,
			encoded: { doubleValue: Number.MIN_VALUE },
		},
		{ label: 'decimal mantissa', value: 1.25e-7, encoded: { doubleValue: 1.25e-7 } },
		{ label: 'decimal notation boundary', value: 1e-6, encoded: { doubleValue: 1e-6 } },
		{ label: 'ordinary fraction', value: 0.5, encoded: { doubleValue: 0.5 } },
		{ label: 'positive integer', value: 42, encoded: { integerValue: 42 } },
		{ label: 'negative integer', value: -42, encoded: { integerValue: -42 } },
		{ label: 'zero', value: 0, encoded: { integerValue: 0 } },
		{ label: 'numeric string', value: '1e-7', encoded: { stringValue: '1e-7' } },
		{
			label: 'nested fractions and integers',
			value: { amount: 1e-7, values: [-1e-7, 42] },
			encoded: {
				mapValue: {
					fields: {
						amount: { doubleValue: 1e-7 },
						values: { arrayValue: { values: [{ doubleValue: -1e-7 }, { integerValue: 42 }] } },
					},
				},
			},
		},
	];

	describe.each(['create', 'upsert'])('%s', (operation) => {
		test.each(cases)('sends the correct Firestore type for $label', async ({ value, encoded }) => {
			const context = mockDeep<IExecuteFunctions>();
			context.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			context.getInputData.mockReturnValue([{ json: { id: 'fixture', value } }]);
			const parameters: IDataObject = {
				resource: 'document',
				operation,
				projectId: 'test-project',
				database: '(default)',
				collection: 'fixtures',
				columns: 'value',
				documentId: 'fixture',
				updateKey: 'id',
				simple: false,
				authentication: 'googleFirebaseCloudFirestoreOAuth2Api',
			};
			context.getNodeParameter.mockImplementation((name) => parameters[name]);
			context.helpers.returnJsonArray.mockImplementation((data) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			);
			context.helpers.constructExecutionMetaData.mockImplementation((items, { itemData }) =>
				items.map((item) => ({ ...item, pairedItem: itemData })),
			);

			const documentName = 'projects/test-project/databases/(default)/documents/fixtures/fixture';
			context.helpers.requestWithAuthentication.mockResolvedValue(
				operation === 'create' ? { name: documentName } : { writeResults: [{}], status: [{}] },
			);

			const result = await new GoogleFirebaseCloudFirestore().execute.call(context);

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledExactlyOnceWith(
				'googleFirebaseCloudFirestoreOAuth2Api',
				expect.objectContaining({
					method: 'POST',
					uri:
						operation === 'create'
							? 'https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents/fixtures'
							: 'https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents:batchWrite',
					body:
						operation === 'create'
							? { fields: { value: encoded } }
							: {
									writes: [
										{
											update: { name: documentName, fields: { value: encoded } },
											updateMask: { fieldPaths: ['value'] },
										},
									],
								},
				}),
			);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});
	});
});
