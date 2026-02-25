import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, calendar => create', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/calendarGroups/AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRu_AAA=/calendars',
			{ color: 'lightOrange', name: 'New Calendar' },
		)
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/calendarGroups('AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRu_AAA%3D')/calendars/$entity",
			id: 'AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAAFXBBZ_AAA=',
			name: 'New Calendar',
			color: 'lightOrange',
			hexColor: '#fcab73',
			isDefaultCalendar: false,
			changeKey: 'WX+A3vy5K0qqTyPHso1JgAABVtwWTA==',
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
		});

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});
});
