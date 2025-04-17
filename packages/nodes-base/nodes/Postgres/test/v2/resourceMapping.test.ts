import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getMappingColumns } from '../../v2/methods/resourceMapping';

jest.mock('../../transport', () => {
	const originalModule = jest.requireActual('../../transport');
	return {
		...originalModule,
		configurePostgres: jest.fn(async () => ({ db: {} })),
	};
});

jest.mock('../../v2/helpers/utils', () => {
	const originalModule = jest.requireActual('../../v2/helpers/utils');
	return {
		...originalModule,
		getEnums: jest.fn(() => []),
		getEnumValues: jest.fn(),
		getTableSchema: jest.fn(() => [
			{
				column_name: 'id',
				data_type: 'bigint',
				is_nullable: 'NO',
				udt_name: 'int8',
				column_default: null,
				identity_generation: 'BY DEFAULT',
				is_generated: 'NEVER',
			},
			{
				column_name: 'name',
				data_type: 'text',
				is_nullable: 'YES',
				udt_name: 'text',
				column_default: null,
				identity_generation: null,
				is_generated: 'NEVER',
			},
		]),
	};
});

describe('Postgres, resourceMapping', () => {
	let loadOptionsFunctions: MockProxy<ILoadOptionsFunctions>;

	beforeEach(() => {
		loadOptionsFunctions = mock<ILoadOptionsFunctions>();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should mark id as not required if identity_generation is "BY_DEFAULT"', async () => {
		loadOptionsFunctions.getCredentials.mockResolvedValue({});
		loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('public');
		loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('test_table');
		loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('insert');

		const fields = await getMappingColumns.call(loadOptionsFunctions);

		expect(fields).toEqual({
			fields: [
				{
					canBeUsedToMatch: true,
					defaultMatch: true,
					display: true,
					displayName: 'id',
					id: 'id',
					options: undefined,
					required: false,
					type: 'number',
				},
				{
					canBeUsedToMatch: true,
					defaultMatch: false,
					display: true,
					displayName: 'name',
					id: 'name',
					options: undefined,
					required: false,
					type: 'string',
				},
			],
		});
	});
});
