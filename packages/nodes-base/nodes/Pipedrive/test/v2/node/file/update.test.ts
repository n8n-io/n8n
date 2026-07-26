import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test PipedriveV2, file => update', () => {
	nock('https://api.pipedrive.com/v1')
		.put('/files/2', { name: 'renamed-file.txt' })
		.reply(200, {
			success: true,
			data: {
				id: 2,
				user_id: 25455458,
				log_id: null,
				add_time: '2026-04-01 22:03:28',
				update_time: '2026-04-01 22:03:33',
				file_name: '3c553e3e-cb74-4a07-81d4-784a31fcc812.txt',
				file_size: 18,
				active_flag: true,
				inline_flag: false,
				remote_location: 's3',
				remote_id: 'company/14712380/user/25455458/files/3c553e3e-cb74-4a07-81d4-784a31fcc812.txt',
				s3_bucket: null,
				url: 'https://app.pipedrive.com/api/v1/files/2/download',
				name: 'renamed-file.txt',
				description: null,
				deal_id: 8,
				lead_id: null,
				person_id: 10,
				org_id: 7,
				product_id: null,
				activity_id: null,
				deal_name: 'Test Deal',
				lead_name: null,
				person_name: 'John Updated',
				org_name: 'Updated Org LLC',
				product_name: null,
				mail_message_id: null,
				mail_template_id: null,
				cid: null,
				file_type: 'txt',
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['update.workflow.json'],
	});
});
