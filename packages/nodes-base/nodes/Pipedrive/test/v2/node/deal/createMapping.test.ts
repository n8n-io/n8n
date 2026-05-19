import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';
import { mockFieldsApi } from '../fieldsApiMock';

describe('Test PipedriveV2, deal => create with customFieldsMapping', () => {
	mockFieldsApi('deal', {
		test_multi: {
			field_type: 'set',
			options: [
				{ id: 1, label: 'Tag One' },
				{ id: 2, label: 'Tag Two' },
				{ id: 3, label: 'Tag Three' },
			],
		},
	});

	// Mapper-only: hex-keyed value goes through to API under custom_fields
	nock('https://api.pipedrive.com/api/v2')
		.post('/deals', {
			title: 'Mapping Test Deal',
			org_id: 7,
			custom_fields: {
				f5ed368466cf0477371c6ee076252f49a188848e: 'from-mapper',
			},
		})
		.reply(200, {
			success: true,
			data: {
				id: 9,
				title: 'Mapping Test Deal',
				org_id: 7,
				custom_fields: {
					f5ed368466cf0477371c6ee076252f49a188848e: 'from-mapper',
				},
			},
		});

	// Set mapping: CSV string is resolved to ID array via encodeCustomFieldsV2
	nock('https://api.pipedrive.com/api/v2')
		.post('/deals', {
			title: 'Set Mapping Deal',
			org_id: 7,
			custom_fields: {
				febf5dbb0f1e95d60876abc4638483291b8ef18b: [1, 3],
			},
		})
		.reply(200, {
			success: true,
			data: {
				id: 10,
				title: 'Set Mapping Deal',
				org_id: 7,
				custom_fields: {
					febf5dbb0f1e95d60876abc4638483291b8ef18b: [1, 3],
				},
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['createMapping.workflow.json', 'createMappingSet.workflow.json'],
	});
});
