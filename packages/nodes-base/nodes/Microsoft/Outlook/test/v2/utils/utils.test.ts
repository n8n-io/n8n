import { UserError } from 'n8n-workflow';

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

	it('should keep a quote in the sender inside its literal', () => {
		const filters = { filterBy: 'filters', filters: { sender: "o'brien@mail.com" } };

		expect(prepareFilterString(filters)).toEqual(
			"(from/emailAddress/address eq 'o''brien@mail.com' or from/emailAddress/name eq 'o''brien@mail.com')",
		);
	});

	it('should keep a quote in a folder id inside its literal', () => {
		const filters = {
			filterBy: 'filters',
			filters: { foldersToInclude: ["a'b"], foldersToExclude: ["c'd"] },
		};

		expect(prepareFilterString(filters)).toEqual(
			"parentFolderId eq 'a''b' and parentFolderId ne 'c''d'",
		);
	});

	it.each(['receivedAfter', 'receivedBefore'])('rejects a %s that is not a date', (field) => {
		const filters = {
			filterBy: 'filters',
			filters: { [field]: "2023-07-31T21:00:00.000Z or contains(subject,'x')" },
		};

		expect(() => prepareFilterString(filters)).toThrow(UserError);
	});

	it('sends a received date in the exact form it was given', () => {
		const filters = {
			filterBy: 'filters',
			filters: {
				receivedAfter: '2023-07-31T21:00:00.000Z',
				receivedBefore: '2023-08-14T21:00:00Z',
			},
		};

		expect(prepareFilterString(filters)).toEqual(
			'receivedDateTime ge 2023-07-31T21:00:00.000Z and receivedDateTime le 2023-08-14T21:00:00Z',
		);
	});

	it('accepts a received date given as milliseconds since the epoch', () => {
		const filters = { filterBy: 'filters', filters: { receivedAfter: 1690837200000 } };

		expect(prepareFilterString(filters)).toEqual('receivedDateTime ge 2023-07-31T21:00:00.000Z');
	});

	it.each([
		[true, 'hasAttachments eq true'],
		['true', 'hasAttachments eq true'],
		['True', 'hasAttachments eq true'],
		['false', 'hasAttachments eq false'],
		['False', 'hasAttachments eq false'],
	])('reduces a hasAttachments of %j to %j', (hasAttachments, expected) => {
		const filters = { filterBy: 'filters', filters: { hasAttachments } };

		expect(prepareFilterString(filters)).toEqual(expected);
	});

	it.each([['no'], ['0'], [1], ['true and isRead eq false']])(
		'rejects a hasAttachments of %j',
		(hasAttachments) => {
			const filters = { filterBy: 'filters', filters: { hasAttachments } };

			expect(() => prepareFilterString(filters)).toThrow(UserError);
		},
	);

	it('sends no clause when hasAttachments is not set', () => {
		const filters = { filterBy: 'filters', filters: { hasAttachments: false } };

		expect(prepareFilterString(filters)).toBeUndefined();
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
