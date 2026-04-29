import nock from 'nock';

import mockData from '../mock-data.json';

type ResourceType = 'activity' | 'deal' | 'organization' | 'person' | 'product';

const fieldEndpoints: Record<ResourceType, string> = {
	activity: '/activityFields',
	deal: '/dealFields',
	organization: '/organizationFields',
	person: '/personFields',
	product: '/productFields',
};

interface FieldOverride {
	field_type?: string;
	options?: Array<{ id: number; label: string }>;
	is_custom_field?: boolean;
}

/**
 * Registers a nock mock for the v2 Fields API endpoint so that
 * custom field resolution/encoding works in workflow tests.
 *
 * `overrides` keys are the friendly names (matching mock-data.json),
 * letting tests upgrade specific fields to enum/set/etc.
 */
export function mockFieldsApi(
	resource: ResourceType,
	overrides: Record<string, FieldOverride> = {},
): void {
	const customFieldKeys = (mockData.customFieldKeys as Record<string, Record<string, string>>)[
		resource
	];

	const fields = Object.entries(customFieldKeys ?? {}).map(([name, code]) => {
		const override = overrides[name] ?? {};
		return {
			field_name: name,
			field_code: code,
			field_type: override.field_type ?? 'text',
			options: override.options ?? null,
			is_custom_field: override.is_custom_field ?? true,
		};
	});

	nock('https://api.pipedrive.com/api/v2')
		.get(fieldEndpoints[resource])
		.query(true)
		.reply(200, {
			success: true,
			data: fields,
			additional_data: {},
		})
		.persist();
}
