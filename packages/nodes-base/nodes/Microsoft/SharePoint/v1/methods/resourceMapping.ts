import type {
	FieldType,
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

import { isForbiddenError, withColumnTypes } from '../../helpers/utils';
import type { IListColumnType } from '../helpers/interfaces';
import { microsoftSharePointApiRequest } from '../transport';

const unsupportedFields = ['geoLocation', 'location', 'term', 'url'];
const fieldTypeMapping: Partial<Record<FieldType, string[]>> = {
	string: ['text', 'user', 'lookup'],
	// unknownFutureValue: rating
	number: ['number', 'currency', 'unknownFutureValue'],
	boolean: ['boolean'],
	dateTime: ['dateTime'],
	object: ['thumbnail'],
	options: ['choice'],
};

function mapType(column: IListColumnType): FieldType | undefined {
	if (unsupportedFields.includes(column.type)) {
		return undefined;
	}
	let mappedType: FieldType = 'string';
	for (const t of Object.keys(fieldTypeMapping)) {
		const postgresTypes = fieldTypeMapping[t as FieldType];
		if (postgresTypes?.includes(column.type)) {
			mappedType = t as FieldType;
		}
	}
	return mappedType;
}

async function loadListColumns(
	this: ILoadOptionsFunctions,
	listPath: string,
): Promise<IListColumnType[]> {
	try {
		const response = await microsoftSharePointApiRequest.call(
			this,
			'GET',
			`${listPath}/contentTypes`,
			{},
			{ expand: 'columns' },
		);
		return response.value[0].columns;
	} catch (error) {
		if (!isForbiddenError(error)) {
			throw error;
		}
	}

	const response = await microsoftSharePointApiRequest.call(this, 'GET', `${listPath}/columns`);
	return withColumnTypes<IListColumnType>(response.value ?? []);
}

export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const site = this.getNodeParameter('site', undefined, { extractValue: true }) as string;
	const list = this.getNodeParameter('list', undefined, { extractValue: true }) as string;
	const operation = this.getNodeParameter('operation') as string;

	const columns = await loadListColumns.call(this, `/sites/${site}/lists/${list}`);

	const fields: ResourceMapperField[] = [];

	for (const column of columns.filter((x) => !x.hidden && !x.readOnly)) {
		const fieldType = mapType(column);
		const field = {
			id: column.name,
			canBeUsedToMatch: column.enforceUniqueValues && column.required,
			defaultMatch: false,
			display: true,
			displayName: column.displayName,
			readOnly: column.readOnly || !fieldType,
			required: column.required,
			type: fieldType,
		} as ResourceMapperField;
		if (field.type === 'options') {
			field.options = [];
			if (Array.isArray(column.choice?.choices)) {
				for (const choice of column.choice.choices) {
					field.options.push({
						name: choice,
						value: choice,
					});
				}
			}
		}
		fields.push(field);
	}

	if (operation === 'update') {
		fields.push({
			id: 'id',
			canBeUsedToMatch: true,
			defaultMatch: false,
			display: true,
			displayName: 'ID',
			readOnly: true,
			required: true,
			type: 'string',
		});
	}

	return { fields };
}
