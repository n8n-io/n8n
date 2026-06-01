import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import type { ColumnInfo } from '../../v2/helpers/interfaces';
import { getEnums, getEnumValues, getTableSchema } from '../../v2/helpers/utils';
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
		getEnums: jest.fn(() => new Map()),
		getEnumValues: jest.fn(),
		getTableSchema: jest.fn(),
	};
});

describe('Postgres, resourceMapping', () => {
	let loadOptionsFunctions: MockProxy<ILoadOptionsFunctions>;

	const createColumnData = (
		columnName: string,
		dataType: string,
		overrides: Partial<ColumnInfo> = {},
	): ColumnInfo => ({
		column_name: columnName,
		data_type: dataType,
		is_nullable: 'NO',
		udt_name: dataType,
		column_default: null,
		is_generated: 'NEVER',
		...overrides,
	});

	beforeEach(() => {
		loadOptionsFunctions = mock<ILoadOptionsFunctions>();
		loadOptionsFunctions.getCredentials.mockResolvedValue({});
		loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('public');
		loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('test_table');
		loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('insert');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test.each([
		{
			name: 'should mark id as not required if identity_generation is "BY_DEFAULT"',
			columnData: createColumnData('id', 'bigint', {
				udt_name: 'int8',
				identity_generation: 'BY DEFAULT',
			}),
			expectedType: 'number',
			expectedRequired: false,
			expectedDefaultMatch: true,
		},
		{
			name: 'should map citext to string type',
			columnData: createColumnData('email', 'citext'),
			expectedType: 'string',
			expectedRequired: true,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map varchar to string type',
			columnData: createColumnData('name', 'varchar', { is_nullable: 'YES' }),
			expectedType: 'string',
			expectedRequired: false,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map integer to number type',
			columnData: createColumnData('count', 'integer', { udt_name: 'int4' }),
			expectedType: 'number',
			expectedRequired: true,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map boolean to boolean type',
			columnData: createColumnData('is_active', 'boolean', {
				udt_name: 'bool',
				column_default: 'false',
			}),
			expectedType: 'boolean',
			expectedRequired: false, // has default
			expectedDefaultMatch: false,
		},
		{
			name: 'should map timestamp to dateTime type',
			columnData: createColumnData('created_at', 'timestamp'),
			expectedType: 'dateTime',
			expectedRequired: true,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map json to object type',
			columnData: createColumnData('metadata', 'json', { is_nullable: 'YES' }),
			expectedType: 'object',
			expectedRequired: false,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map USER-DEFINED enum to options type',
			columnData: createColumnData('status', 'USER-DEFINED', { udt_name: 'status_enum' }),
			expectedType: 'options',
			expectedRequired: true,
			expectedDefaultMatch: false,
			isEnum: true,
			expectedOptions: [
				{ name: 'Active', value: 'active' },
				{ name: 'Inactive', value: 'inactive' },
			],
		},
		{
			name: 'should map unknown USER-DEFINED type to string by default',
			columnData: createColumnData('custom_field', 'USER-DEFINED', { udt_name: 'unknown_type' }),
			expectedType: 'string',
			expectedRequired: true,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map uuid to string type',
			columnData: createColumnData('user_id', 'uuid'),
			expectedType: 'string',
			expectedRequired: true,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map PostGIS geometry to string type',
			columnData: createColumnData('location', 'USER-DEFINED', { udt_name: 'geometry' }),
			expectedType: 'string',
			expectedRequired: true,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map inet address to string type',
			columnData: createColumnData('ip_address', 'inet'),
			expectedType: 'string',
			expectedRequired: true,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map hstore to object type',
			columnData: createColumnData('attributes', 'USER-DEFINED', { udt_name: 'hstore' }),
			expectedType: 'object',
			expectedRequired: true,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map range types to string type',
			columnData: createColumnData('price_range', 'USER-DEFINED', { udt_name: 'numrange' }),
			expectedType: 'string',
			expectedRequired: true,
			expectedDefaultMatch: false,
		},
		{
			name: 'should map unknown data type to string by default',
			columnData: createColumnData('unknown_field', 'unknown_postgres_type', {
				udt_name: 'unknown',
			}),
			expectedType: 'string',
			expectedRequired: true,
			expectedDefaultMatch: false,
		},
	])(
		'$name',
		async ({
			columnData,
			expectedType,
			expectedRequired,
			expectedDefaultMatch,
			isEnum,
			expectedOptions,
		}) => {
			jest.mocked(getTableSchema).mockResolvedValueOnce([columnData]);

			// Mock enum data if this test case represents an enum
			if (isEnum && columnData.udt_name) {
				jest
					.mocked(getEnums)
					.mockResolvedValueOnce(new Map([[columnData.udt_name, ['active', 'inactive']]]));
				jest.mocked(getEnumValues).mockReturnValueOnce([
					{ name: 'Active', value: 'active' },
					{ name: 'Inactive', value: 'inactive' },
				]);
			}

			const fields = await getMappingColumns.call(loadOptionsFunctions);

			expect(fields).toEqual({
				fields: [
					{
						canBeUsedToMatch: true,
						defaultMatch: expectedDefaultMatch,
						display: true,
						displayName: columnData.column_name,
						id: columnData.column_name,
						options: expectedOptions ?? undefined,
						required: expectedRequired,
						type: expectedType,
					},
				],
			});
		},
	);
});
