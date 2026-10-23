import nock from 'nock';

import mockData from '../mock-data.json';

type V2ResourceType = 'activity' | 'deal' | 'organization' | 'person' | 'product';
type V1ResourceType = 'lead';
type ResourceType = V2ResourceType | V1ResourceType;

const v2FieldEndpoints: Record<V2ResourceType, string> = {
	activity: '/activityFields',
	deal: '/dealFields',
	organization: '/organizationFields',
	person: '/personFields',
	product: '/productFields',
};

const v1FieldEndpoints: Record<V1ResourceType, string> = {
	lead: '/leadFields',
};

/**
 * Registers a nock mock for the Fields API endpoint so that
 * custom field resolution/encoding works in workflow tests.
 */
export function mockFieldsApi(resource: ResourceType): void {
	const customFieldKeys = (mockData.customFieldKeys as Record<string, Record<string, string>>)[
		resource
	];

	if (resource in v2FieldEndpoints) {
		const fields = Object.entries(customFieldKeys ?? {}).map(([name, code]) => ({
			field_name: name,
			field_code: code,
			field_type: 'text',
			options: null,
			is_custom_field: true,
		}));

		nock('https://api.pipedrive.com/api/v2')
			.get(v2FieldEndpoints[resource as V2ResourceType])
			.query(true)
			.reply(200, {
				success: true,
				data: fields,
				additional_data: {},
			})
			.persist();
	} else {
		// v1 Fields API uses key/name instead of field_code/field_name
		const fields = Object.entries(customFieldKeys ?? {}).map(([name, key]) => ({
			name,
			key,
			field_type: 'text',
			options: null,
		}));

		nock('https://api.pipedrive.com/v1')
			.get(v1FieldEndpoints[resource as V1ResourceType])
			.query(true)
			.reply(200, {
				success: true,
				data: fields,
				additional_data: {
					pagination: { more_items_in_collection: false },
				},
			})
			.persist();
	}
}
