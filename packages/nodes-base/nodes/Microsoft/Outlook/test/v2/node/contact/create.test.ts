import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, contact => create', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post('/contacts', {
			assistantName: 'Assistant',
			birthday: '1991-09-19T21:00:00.000Z',
			categories: ['blue', 'green'],
			companyName: 'Company',
			department: 'IT',
			displayName: 'User Name',
			givenName: 'User',
			surname: 'Name',
			title: 'Title',
		})
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/contacts/$entity",
			'@odata.etag': 'W/"EQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3Bob"',
			id: 'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEOAABZf4De-LkrSqpPI8eyjUmAAAFXBCQuAAA=',
			createdDateTime: '2023-09-04T08:48:39Z',
			lastModifiedDateTime: '2023-09-04T08:48:39Z',
			changeKey: 'EQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3Bob',
			categories: ['blue', 'green'],
			parentFolderId:
				'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAAAAAEOAAA=',
			birthday: '1991-09-19T11:59:00Z',
			fileAs: '',
			displayName: 'User Name',
			givenName: 'User',
			initials: null,
			middleName: null,
			nickName: null,
			surname: 'Name',
			title: 'Title',
			yomiGivenName: null,
			yomiSurname: null,
			yomiCompanyName: null,
			generation: null,
			imAddresses: [],
			jobTitle: null,
			companyName: 'Company',
			department: 'IT',
			officeLocation: null,
			profession: null,
			businessHomePage: null,
			assistantName: 'Assistant',
			manager: null,
			homePhones: [],
			mobilePhone: null,
			businessPhones: [],
			spouseName: null,
			personalNotes: '',
			children: [],
			emailAddresses: [],
			homeAddress: {},
			businessAddress: {},
			otherAddress: {},
		});

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});
});
