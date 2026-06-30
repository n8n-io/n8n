import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	createMessage,
	makeRecipient,
	prepareContactFields,
	prepareFilterString,
	simplifyOutputMessages,
	validateMailbox,
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
	it('should create filter string with a single folder to include', () => {
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
			"(parentFolderId eq 'DDDxCCC...=') and parentFolderId ne 'AAAxBBB...=' and (from/emailAddress/address eq 'test@mail.com' or from/emailAddress/name eq 'test@mail.com') and hasAttachments eq true and isRead eq false and receivedDateTime ge 2023-07-31T21:00:00.000Z and receivedDateTime le 2023-08-14T21:00:00.000Z and isRead eq false";

		const data = prepareFilterString(filters);

		expect(data).toEqual(result);
	});

	it('should wrap multiple folders to include in parentheses to ensure correct operator precedence', () => {
		const filters = {
			filterBy: 'filters',
			filters: {
				foldersToInclude: ['FolderA...=', 'FolderB...='],
			},
		};
		const result = "(parentFolderId eq 'FolderA...=' or parentFolderId eq 'FolderB...=')";

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

describe('Test MicrosoftOutlookV2, validateMailbox', () => {
	const node: INode = {
		id: 'test-node',
		name: 'Microsoft Outlook',
		type: 'n8n-nodes-base.microsoftOutlook',
		typeVersion: 2,
		position: [0, 0],
		parameters: {},
	};

	it('should accept a user GUID', () => {
		expect(() => validateMailbox('11111111-1111-1111-1111-111111111111', node)).not.toThrow();
	});

	it('should accept a UPN', () => {
		expect(() => validateMailbox('jane@contoso.com', node)).not.toThrow();
	});

	it('should accept a UPN containing "+" (sub-addressing)', () => {
		expect(() => validateMailbox('jane+test@contoso.com', node)).not.toThrow();
	});

	it("should accept a UPN containing an apostrophe (e.g. o'connor)", () => {
		expect(() => validateMailbox("o'connor@contoso.com", node)).not.toThrow();
	});

	it('should reject a bare host/domain (not a valid mailbox identifier)', () => {
		expect(() => validateMailbox('contoso.onmicrosoft.com', node)).toThrow(
			'The mailbox is not valid',
		);
		expect(() => validateMailbox('contoso', node)).toThrow('The mailbox is not valid');
	});

	it('should throw the static "required" error for empty/whitespace', () => {
		expect(() => validateMailbox('', node)).toThrow(
			'A mailbox is required for the Service Principal',
		);
		// whitespace is trimmed by the caller, so the validator sees '' here too
		expect(() => validateMailbox('', node)).toThrow(NodeOperationError);
	});

	it('should reject dots-only ids', () => {
		expect(() => validateMailbox('.', node)).toThrow('The mailbox is not valid');
		expect(() => validateMailbox('..', node)).toThrow('The mailbox is not valid');
		expect(() => validateMailbox('...', node)).toThrow('The mailbox is not valid');
	});

	it('should reject slashy / traversal ids', () => {
		expect(() => validateMailbox('a/b', node)).toThrow('The mailbox is not valid');
		expect(() => validateMailbox('a\\b', node)).toThrow('The mailbox is not valid');
		expect(() => validateMailbox('../evil', node)).toThrow('The mailbox is not valid');
		expect(() => validateMailbox('%2e%2e', node)).toThrow('The mailbox is not valid');
		expect(() => validateMailbox('https://evil.com', node)).toThrow('The mailbox is not valid');
	});

	it('should reject other URL-unsafe characters (?, #, space)', () => {
		expect(() => validateMailbox('a?b', node)).toThrow('The mailbox is not valid');
		expect(() => validateMailbox('a#b', node)).toThrow('The mailbox is not valid');
		expect(() => validateMailbox('a b@contoso.com', node)).toThrow('The mailbox is not valid');
	});

	it('should reject a drive-style "!"-bearing id (proves the drive shape was not lifted)', () => {
		expect(() => validateMailbox('b!abc', node)).toThrow('The mailbox is not valid');
	});

	it('should reject an encoded-traversal input (validate runs before encode)', () => {
		expect(() => validateMailbox('..%2f..%2fadmin@evil.com', node)).toThrow(
			'The mailbox is not valid',
		);
	});

	it('should throw a static message/description that never echoes the rejected id', () => {
		let caught: NodeOperationError | undefined;
		try {
			validateMailbox('..%2f..%2fadmin@evil.com', node);
		} catch (error) {
			caught = error as NodeOperationError;
		}
		expect(caught).toBeDefined();
		expect(caught?.message).not.toContain('evil');
		expect(caught?.message).not.toContain('..');
		expect(caught?.message).not.toContain('%2');
		expect(caught?.description).not.toContain('evil');
		expect(caught?.description).not.toContain('..');
		expect(caught?.description).not.toContain('%2');
	});
});
