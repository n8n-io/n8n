import type {
	IDataObject,
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

import { mapPipedriveFieldType } from '../helpers';
import { pipedriveApiRequestAllItemsCursor, pipedriveApiRequestAllItemsOffset } from '../transport';

const FIELD_ENDPOINTS_V2: Record<string, string> = {
	activity: '/activityFields',
	deal: '/dealFields',
	organization: '/organizationFields',
	person: '/personFields',
	product: '/productFields',
};

const FIELD_ENDPOINTS_V1: Record<string, string> = {
	lead: '/leadFields',
};

interface RawPipedriveField {
	field_code?: string;
	key?: string;
	field_name?: string;
	name?: string;
	field_type?: string;
	is_custom_field?: boolean;
	edit_flag?: boolean;
	options?: Array<{ id: number; label: string }>;
}

export async function getCustomFieldsMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const resource = this.getCurrentNodeParameter('resource') as string | undefined;

	if (!resource || (!FIELD_ENDPOINTS_V2[resource] && !FIELD_ENDPOINTS_V1[resource])) {
		return {
			fields: [],
			emptyFieldsNotice: 'Select a resource to load custom fields.',
		};
	}

	let rawFields: IDataObject[];
	try {
		if (FIELD_ENDPOINTS_V2[resource]) {
			const { data } = await pipedriveApiRequestAllItemsCursor.call(
				this,
				'GET',
				FIELD_ENDPOINTS_V2[resource],
				{},
			);
			rawFields = data;
		} else {
			const { data } = await pipedriveApiRequestAllItemsOffset.call(
				this,
				'GET',
				FIELD_ENDPOINTS_V1[resource],
				{},
			);
			rawFields = data;
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown error';
		return {
			fields: [],
			emptyFieldsNotice: `Could not load custom fields: ${message}`,
		};
	}

	const fields: ResourceMapperField[] = [];

	for (const raw of rawFields as RawPipedriveField[]) {
		// v2 endpoints set `is_custom_field`; older v1 leadFields responses
		// only set `edit_flag`. Treat either as the custom-field marker.
		if (raw.is_custom_field !== true && raw.edit_flag !== true) continue;

		const id = raw.field_code ?? raw.key;
		const displayName = raw.field_name ?? raw.name;
		if (!id || !displayName) continue;

		const type = mapPipedriveFieldType(raw.field_type);

		const field: ResourceMapperField = {
			id,
			displayName,
			defaultMatch: false,
			canBeUsedToMatch: false,
			display: true,
			required: false,
			type,
		};

		if (type === 'options' && Array.isArray(raw.options)) {
			// Prepend a synthetic "Clear value" option so users can null-out
			// enum/visible_to fields. encodeCustomFieldsV2 maps '' → null.
			field.options = [
				{ name: '— Clear value —', value: '' },
				...raw.options.map((option) => ({
					name: String(option.label),
					value: option.id,
				})),
			];
		}

		fields.push(field);
	}

	fields.sort((a, b) => a.displayName.localeCompare(b.displayName));

	return { fields };
}
