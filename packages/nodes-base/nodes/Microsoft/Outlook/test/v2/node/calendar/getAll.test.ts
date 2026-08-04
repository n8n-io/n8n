import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, calendar => getAll', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get('/calendars?%24filter=canEdit%20eq%20true&%24top=2')
		.reply(200, {
			value: [
				{
					id: 'AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAAAJ9-JDAAA=',
					name: 'Calendar',
					color: 'auto',
					hexColor: '',
					isDefaultCalendar: true,
					changeKey: 'WX+A3vy5K0qqTyPHso1JgAAACfdHfw==',
					canShare: true,
					canViewPrivateItems: true,
					canEdit: true,
					allowedOnlineMeetingProviders: ['teamsForBusiness'],
					defaultOnlineMeetingProvider: 'teamsForBusiness',
					isTallyingResponses: true,
					isRemovable: false,
					owner: {
						name: 'User Name',
						address: 'test@mail.com',
					},
				},
				{
					id: 'AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRvBAAA=',
					name: 'Third calendar',
					color: 'lightYellow',
					hexColor: '#fde300',
					isDefaultCalendar: false,
					changeKey: 'WX+A3vy5K0qqTyPHso1JgAAAi67hIw==',
					canShare: true,
					canViewPrivateItems: true,
					canEdit: true,
					allowedOnlineMeetingProviders: ['teamsForBusiness'],
					defaultOnlineMeetingProvider: 'teamsForBusiness',
					isTallyingResponses: false,
					isRemovable: true,
					owner: {
						name: 'User Name',
						address: 'test@mail.com',
					},
				},
			],
		});

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
