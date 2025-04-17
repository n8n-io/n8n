import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test MicrosoftOutlookV2, calendar => get', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get(
			'/calendars/AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRvGAAA=',
		)
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/calendars/$entity",
			id: 'AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRvGAAA=',
			name: 'Foo Calendar',
			color: 'lightGreen',
			hexColor: '#87d28e',
			isDefaultCalendar: false,
			changeKey: 'WX+A3vy5K0qqTyPHso1JgAAAi67hiw==',
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

	const workflows = ['nodes/Microsoft/Outlook/test/v2/node/calendar/get.workflow.json'];
	testWorkflows(workflows);
});
