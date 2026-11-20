import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, organization => update with standard fields', () => {
	mockFieldsApi('organization');

	nock('https://api.pipedrive.com/api/v2')
		.patch('/organizations/7', {
			address: {
				value: 'Dietmar-Hopp-Allee 16, 69190 Walldorf, Germany',
			},
			annual_revenue: 1000000,
			employee_count: 51,
			industry: 4,
			linkedin: 'https://www.linkedin.com/company/example',
			website: 'example.com',
		})
		.reply(200, {
			success: true,
			data: {
				id: 7,
				name: 'Updated Org LLC',
				add_time: '2026-04-01T22:03:26Z',
				update_time: '2026-04-01T22:03:32Z',
				visible_to: 3,
				owner_id: 25455458,
				label_ids: [],
				website: 'example.com',
				linkedin: 'https://www.linkedin.com/company/example',
				industry: 4,
				annual_revenue: 1000000,
				employee_count: 51,
				is_deleted: false,
				address: {
					value: 'Dietmar-Hopp-Allee 16, 69190 Walldorf, Germany',
					country: 'Germany',
					locality: 'Walldorf',
					postal_code: '69190',
					route: 'Dietmar-Hopp-Allee',
					street_number: '16',
				},
				custom_fields: {
					a033342fdeb029669a0652a64d1ab8150e48d627: null,
				},
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['updateStandardFields.workflow.json'],
	});
});
