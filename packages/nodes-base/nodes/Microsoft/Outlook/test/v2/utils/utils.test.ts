import {
	createMessage,
	makeRecipient,
	prepareContactFields,
	prepareFilterString,
	simplifyOutputMessages,
} from '../../../v2/helpers/utils';

describe('Test MicrosoftOutlookV2, makeRecipient', () => {
	it('should create recipient object', () => {
		const replyTo = 'test1@mail.com, test2@mail.com';
		const result = replyTo.split(',').map((recipient: string) => {
			return makeRecipient(recipient.trim());
		});

		expect(result).toEqual([
			{
				emailAddress: {
					address: 'test1@mail.com',
				},
			},
			{
				emailAddress: {
					address: 'test2@mail.com',
				},
			},
		]);
	});
});

describe('Test MicrosoftOutlookV2, prepareContactFields', () => {
	it('should create contact object', () => {
		const fields = {
			assistantName: 'Assistant',
			birthday: '2023-07-31T21:00:00.000Z',
			businessAddress: {
				values: {
					city: 'City',
					countryOrRegion: 'Country',
					postalCode: '777777',
					state: 'State',
					street: 'Street',
				},
			},
			businessHomePage: 'page.com',
			categories: 'cat1,cat2',
			companyName: 'Company',
		};
		const result = {
			assistantName: 'Assistant',
			birthday: '2023-07-31T21:00:00.000Z',
			businessAddress: {
				city: 'City',
				countryOrRegion: 'Country',
				postalCode: '777777',
				state: 'State',
				street: 'Street',
			},
			businessHomePage: 'page.com',
			categories: ['cat1', 'cat2'],
			companyName: 'Company',
		};

		const data = prepareContactFields(fields);

		expect(data).toEqual(result);
	});
});

describe('Test MicrosoftOutlookV2, prepareFilterString', () => {
	it('should create filter string', () => {
		const filters = {
			filterBy: 'filters',
			filters: {
				custom: 'isRead eq false',
				hasAttachments: true,
				foldersToExclude: ['AAAxBBB...='],
				foldersToInclude: ['DDDxCCC...='],
				readStatus: 'unread',
				receivedAfter: '2023-07-31T21:00:00.000Z',
				receivedBefore: '2023-08-14T21:00:00.000Z',
				sender: 'test@mail.com',
			},
		};
		const result =
			"parentFolderId eq 'DDDxCCC...=' and parentFolderId ne 'AAAxBBB...=' and (from/emailAddress/address eq 'test@mail.com' or from/emailAddress/name eq 'test@mail.com') and hasAttachments eq true and isRead eq false and receivedDateTime ge 2023-07-31T21:00:00.000Z and receivedDateTime le 2023-08-14T21:00:00.000Z and isRead eq false";

		const data = prepareFilterString(filters);

		expect(data).toEqual(result);
	});
});

describe('Test MicrosoftOutlookV2, simplifyOutputMessages', () => {
	it('should create recipient object', () => {
		const responseData = {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('')/messages(id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments)/$entity",
			'@odata.etag': 'W/"CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFSpKec"',
			id: 'AAAxBBBxCCC...=',
			categories: [],
			hasAttachments: false,
			subject: 'My draft',
			bodyPreview:
				'test\r\n________________________________\r\nFrom: Me\r\nSent: Tuesday, August 29, 2023 7:33:28 AM\r\nTo: from@mail.com <from@mail.com>\r\nSubject: My draft\r\n\r\nthis is a draft',
			conversationId: 'AAAQQQMMM..=',
			from: {
				emailAddress: {
					name: 'Me',
					address: 'test@mail.com',
				},
			},
			toRecipients: [
				{
					emailAddress: {
						name: 'Me',
						address: 'test@mail.com',
					},
				},
			],
		};
		const result = [
			{
				id: 'AAAxBBBxCCC...=',
				conversationId: 'AAAQQQMMM..=',
				subject: 'My draft',
				bodyPreview:
					'test\r\n________________________________\r\nFrom: Me\r\nSent: Tuesday, August 29, 2023 7:33:28 AM\r\nTo: from@mail.com <from@mail.com>\r\nSubject: My draft\r\n\r\nthis is a draft',
				from: 'test@mail.com',
				to: ['test@mail.com'],
				categories: [],
				hasAttachments: false,
			},
		];

		const data = simplifyOutputMessages([responseData]);

		expect(data).toEqual(result);
	});
});

describe('Test MicrosoftOutlookV2, createMessage', () => {
	it('should create message object', () => {
		const fields = {
			bodyContent: 'Test message',
			bodyContentType: 'Text',
			bccRecipients: 'test1@mail.com, test2@mail.com',
			categories: ['cat1', 'cat2', 'cat3'],
			ccRecipients: 'test3@mail.com',
			internetMessageHeaders: [
				{
					name: 'customHeader',
					value: 'customValue',
				},
				{
					name: 'customHeader2',
					value: 'customValue2',
				},
			],
			from: 'me@mail.com',
			importance: 'Normal',
			isReadReceiptRequested: true,
			replyTo: 'test4@mail.com',
			subject: 'Test Subject',
			toRecipients: 'to@mail.com',
		};

		const result = {
			body: {
				content: 'Test message',
				contentType: 'Text',
			},
			bccRecipients: [
				{
					emailAddress: {
						address: 'test1@mail.com',
					},
				},
				{
					emailAddress: {
						address: 'test2@mail.com',
					},
				},
			],
			categories: ['cat1', 'cat2', 'cat3'],
			ccRecipients: [
				{
					emailAddress: {
						address: 'test3@mail.com',
					},
				},
			],
			internetMessageHeaders: [
				{
					name: 'customHeader',
					value: 'customValue',
				},
				{
					name: 'customHeader2',
					value: 'customValue2',
				},
			],
			from: {
				emailAddress: {
					address: 'me@mail.com',
				},
			},
			importance: 'Normal',
			isReadReceiptRequested: true,
			replyTo: [
				{
					emailAddress: {
						address: 'test4@mail.com',
					},
				},
			],
			subject: 'Test Subject',
			toRecipients: [
				{
					emailAddress: {
						address: 'to@mail.com',
					},
				},
			],
		};

		const message = createMessage(fields);

		expect(message).toEqual(result);
	});
});
