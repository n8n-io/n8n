import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, calendar => update', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.patch(
			'/calendars/AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRvGAAA=',
			{ color: 'lightOrange', isDefaultCalendar: false, name: 'Foo' },
		)
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/calendars/$entity",
			id: 'AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRvGAAA=',
			name: 'Foo',
			color: 'lightOrange',
			hexColor: '#fcab73',
			isDefaultCalendar: false,
			changeKey: 'WX+A3vy5K0qqTyPHso1JgAABVtwYKA==',
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
		workflowFiles: ['update.workflow.json'],
	});
});
