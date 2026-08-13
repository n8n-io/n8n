import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, person => create', () => {
	mockFieldsApi('person');

	nock('https://api.pipedrive.com/api/v2')
		.post('/persons', {
			name: 'John Test',
			emails: [
				{
					value: 'john@test.com',
					primary: true,
					label: 'work',
				},
			],
			phones: [
				{
					value: '555-0100',
					primary: true,
					label: 'work',
				},
			],
			org_id: 7,
		})
		.reply(200, {
			success: true,
			data: {
				id: 10,
				name: 'John Test',
				first_name: 'John',
				last_name: 'Test',
				add_time: '2026-04-01T22:03:26Z',
				update_time: null,
				visible_to: 3,
				custom_fields: {
					'56ad1919c14a9089bf02fdca519f6394b0e5d5ab': null,
					'48f483ac81a7b619c59322931ea839310e987725': null,
					'7095cf9bf6bdeb457b12a76fdbb0fe06c0ad5151': null,
				},
				owner_id: 25455458,
				label_ids: [],
				org_id: 7,
				is_deleted: false,
				picture_id: null,
				phones: [
					{
						label: 'work',
						value: '555-0100',
						primary: true,
					},
				],
				emails: [
					{
						label: 'work',
						value: 'john@test.com',
						primary: true,
					},
				],
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.workflow.json'],
	});
});
