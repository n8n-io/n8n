import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, person => getAll', () => {
	mockFieldsApi('person');

	nock('https://api.pipedrive.com/api/v2')
		.get('/persons')
		.query({ limit: 2 })
		.reply(200, {
			success: true,
			data: [
				{
					id: 1,
					name: '[Sample] Benjamin Leon',
					first_name: '[Sample] Benjamin',
					last_name: 'Leon',
					add_time: '2026-04-01T19:00:37Z',
					update_time: '2026-04-01T19:00:38Z',
					visible_to: 3,
					custom_fields: {
						'56ad1919c14a9089bf02fdca519f6394b0e5d5ab': null,
						'48f483ac81a7b619c59322931ea839310e987725': null,
						'7095cf9bf6bdeb457b12a76fdbb0fe06c0ad5151': null,
					},
					owner_id: 25455458,
					label_ids: [],
					org_id: null,
					is_deleted: false,
					picture_id: null,
					phones: [
						{
							label: '',
							value: '785-202-7824',
							primary: true,
						},
					],
					emails: [
						{
							label: 'work',
							value: 'benjamin.leon@gmial.com',
							primary: true,
						},
					],
				},
				{
					id: 2,
					name: '[Sample] Kanushi Barnes',
					first_name: '[Sample] Kanushi',
					last_name: 'Barnes',
					add_time: '2026-04-01T19:00:37Z',
					update_time: '2026-04-01T19:00:39Z',
					visible_to: 3,
					custom_fields: {
						'56ad1919c14a9089bf02fdca519f6394b0e5d5ab': null,
						'48f483ac81a7b619c59322931ea839310e987725': null,
						'7095cf9bf6bdeb457b12a76fdbb0fe06c0ad5151': null,
					},
					owner_id: 25455458,
					label_ids: [],
					org_id: null,
					is_deleted: false,
					picture_id: null,
					phones: [],
					emails: [
						{
							label: 'work',
							value: 'kanushi.barnes@gmial.com',
							primary: true,
						},
					],
				},
			],
			additional_data: {
				next_cursor:
					'eyJmaWVsZCI6ImlkIiwiZmllbGRWYWx1ZSI6Mywic29ydERpcmVjdGlvbiI6ImFzYyIsImlkIjozfQ',
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
