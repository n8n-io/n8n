import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { jsonParse } from 'n8n-workflow';
import nock from 'nock';

describe('Google Contacts', () => {
	const credentials = {
		googleContactsOAuth2Api: {
			scope: 'https://www.googleapis.com/auth/contacts',
			oauthTokenData: {
				access_token: 'test-access-token',
			},
		},
	};

	describe('Contact Create Operation', () => {
		beforeAll(() => {
			const mock = nock('https://people.googleapis.com/v1');

			// Mock successful contact creation - handle all variations
			mock
				.post('/people:createContact')
				.reply(function (_, requestBody: any) {
					const parsedBody = typeof requestBody === 'string' ? jsonParse(requestBody) : requestBody;
					if (parsedBody.names && parsedBody.names[0].givenName === 'John') {
						return [
							201,
							{
								resourceName: 'people/c123456789',
								etag: '%EgYBAgMEBQYHCCESBCAFIAI=.',
								names: [
									{
										metadata: {
											primary: true,
											source: { type: 'CONTACT', id: 'c123456789' },
										},
										displayName: 'John Doe',
										familyName: 'Doe',
										givenName: 'John',
										displayNameLastFirst: 'Doe, John',
									},
								],
							},
						];
					}
					// For any other create request (Jane or any other contact)
					return [
						201,
						{
							resourceName: 'people/c987654321',
							etag: '%EgYBAgMEBQYHCCESBCAFIAI=.',
							names: [
								{
									metadata: {
										primary: true,
										source: { type: 'CONTACT', id: 'c987654321' },
									},
									displayName: 'Dr. Jane Marie Smith Jr.',
									familyName: 'Smith',
									givenName: 'Jane',
									middleName: 'Marie',
									honorificPrefix: 'Dr.',
									honorificSuffix: 'Jr.',
								},
							],
							emailAddresses: [
								{
									metadata: { primary: true, source: { type: 'CONTACT', id: 'c987654321' } },
									value: 'jane@example.com',
									type: 'work',
								},
							],
							phoneNumbers: [
								{
									metadata: { primary: true, source: { type: 'CONTACT', id: 'c987654321' } },
									value: '+1234567890',
									type: 'mobile',
								},
							],
						},
					];
				})
				.persist();
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['contact-create-basic.workflow.json', 'contact-create-full.workflow.json'],
		});
	});

	describe('Contact Delete Operation', () => {
		beforeAll(() => {
			const mock = nock('https://people.googleapis.com/v1');

			// Mock successful contact deletion
			mock.delete('/people/c123456789:deleteContact').reply(200, {});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['contact-delete.workflow.json'],
		});
	});

	describe('Contact Get Operation', () => {
		beforeAll(() => {
			const mock = nock('https://people.googleapis.com/v1');

			// Mock get contact with specific fields
			mock
				.get('/people/c123456789')
				.query({
					personFields: 'names,emailAddresses,phoneNumbers',
				})
				.reply(200, {
					resourceName: 'people/c123456789',
					etag: '%EgYBAgMEBQYHCCESBCAFIAI=.',
					names: [
						{
							metadata: {
								primary: true,
								source: { type: 'CONTACT', id: 'c123456789' },
							},
							displayName: 'John Doe',
							familyName: 'Doe',
							givenName: 'John',
						},
					],
					emailAddresses: [
						{
							metadata: { primary: true, source: { type: 'CONTACT', id: 'c123456789' } },
							value: 'john@example.com',
							type: 'work',
						},
					],
					phoneNumbers: [
						{
							metadata: { primary: true, source: { type: 'CONTACT', id: 'c123456789' } },
							value: '+1234567890',
							type: 'mobile',
						},
					],
				});

			// Mock get contact with all fields
			mock
				.get('/people/c123456789')
				.query({
					personFields:
						'addresses,biographies,birthdays,coverPhotos,emailAddresses,events,genders,imClients,interests,locales,memberships,metadata,names,nicknames,occupations,organizations,phoneNumbers,photos,relations,residences,sipAddresses,skills,urls,userDefined',
				})
				.reply(200, {
					resourceName: 'people/c123456789',
					etag: '%EgYBAgMEBQYHCCESBCAFIAI=.',
					names: [
						{
							metadata: {
								primary: true,
								source: { type: 'CONTACT', id: 'c123456789' },
							},
							displayName: 'John Doe',
							familyName: 'Doe',
							givenName: 'John',
						},
					],
					emailAddresses: [
						{
							metadata: { primary: true, source: { type: 'CONTACT', id: 'c123456789' } },
							value: 'john@example.com',
							type: 'work',
						},
					],
					phoneNumbers: [
						{
							metadata: { primary: true, source: { type: 'CONTACT', id: 'c123456789' } },
							value: '+1234567890',
							type: 'mobile',
						},
					],
					addresses: [
						{
							metadata: { primary: true, source: { type: 'CONTACT', id: 'c123456789' } },
							type: 'home',
							formattedValue: '123 Main St\nAnytown, CA 12345',
							streetAddress: '123 Main St',
							city: 'Anytown',
							region: 'CA',
							postalCode: '12345',
						},
					],
					organizations: [
						{
							metadata: { primary: true, source: { type: 'CONTACT', id: 'c123456789' } },
							name: 'Example Corp',
							title: 'Software Engineer',
							current: true,
						},
					],
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['contact-get-fields.workflow.json', 'contact-get-all.workflow.json'],
		});
	});

	describe('Contact Get All Operation', () => {
		beforeAll(() => {
			const mock = nock('https://people.googleapis.com/v1');

			// Mock cache warmup requests with specific empty query
			mock
				.get('/people:searchContacts')
				.query((actualQuery) => actualQuery.query === '')
				.reply(200, {
					results: [],
				})
				.persist();

			mock
				.get('/people/me/connections')
				.query(true) // Match any query parameters
				.reply(function (uri) {
					const url = new URL(uri, 'https://people.googleapis.com');
					const params = url.searchParams;

					// Handle different scenarios based on query params
					if (params.get('pageSize') === '1') {
						// Limited results case
						return [
							200,
							{
								connections: [
									{
										resourceName: 'people/c123456789',
										etag: '%EgYBAgMEBQYHCCESBCAFIAI=.',
										names: [
											{
												metadata: {
													primary: true,
													source: { type: 'CONTACT', id: 'c123456789' },
												},
												displayName: 'John Doe',
												familyName: 'Doe',
												givenName: 'John',
											},
										],
									},
								],
								nextPageToken: '',
							},
						];
					} else if (params.get('personFields') === 'names,emailAddresses') {
						// Full results case with email addresses
						return [
							200,
							{
								connections: [
									{
										resourceName: 'people/c123456789',
										etag: '%EgYBAgMEBQYHCCESBCAFIAI=.',
										names: [
											{
												metadata: {
													primary: true,
													source: { type: 'CONTACT', id: 'c123456789' },
												},
												displayName: 'John Doe',
												familyName: 'Doe',
												givenName: 'John',
											},
										],
										emailAddresses: [
											{
												metadata: { primary: true, source: { type: 'CONTACT', id: 'c123456789' } },
												value: 'john@example.com',
												type: 'work',
											},
										],
									},
									{
										resourceName: 'people/c987654321',
										etag: '%EgYBAgMEBQYHCCESBCAFIAI=.',
										names: [
											{
												metadata: {
													primary: true,
													source: { type: 'CONTACT', id: 'c987654321' },
												},
												displayName: 'Jane Smith',
												familyName: 'Smith',
												givenName: 'Jane',
											},
										],
										emailAddresses: [
											{
												metadata: { primary: true, source: { type: 'CONTACT', id: 'c987654321' } },
												value: 'jane@example.com',
												type: 'work',
											},
										],
									},
								],
								nextPageToken: '',
							},
						];
					}

					// Default response for cache warmup and other requests
					return [200, { connections: [] }];
				})
				.persist();

			// Mock search contacts using query with function to better handle
			mock
				.get('/people:searchContacts')
				.query(true)
				.reply(function (uri) {
					const url = new URL(uri, 'https://people.googleapis.com');
					const params = url.searchParams;

					// Handle search query specifically
					if (params.get('query') === 'John' && params.get('readMask')) {
						return [
							200,
							{
								results: [
									{
										person: {
											resourceName: 'people/c123456789',
											etag: '%EgYBAgMEBQYHCCESBCAFIAI=.',
											names: [
												{
													metadata: {
														primary: true,
														source: { type: 'CONTACT', id: 'c123456789' },
													},
													displayName: 'John Doe',
													familyName: 'Doe',
													givenName: 'John',
												},
											],
											emailAddresses: [
												{
													metadata: {
														primary: true,
														source: { type: 'CONTACT', id: 'c123456789' },
													},
													value: 'john@example.com',
													type: 'work',
												},
											],
										},
									},
								],
								nextPageToken: '',
							},
						];
					}

					// Default response for cache warmup
					return [200, { results: [] }];
				})
				.persist();
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: [
				'contact-getall-connections.workflow.json',
				'contact-getall-search.workflow.json',
				'contact-getall-limit.workflow.json',
			],
		});
	});

	describe('Contact Update Operation', () => {
		beforeAll(() => {
			const mock = nock('https://people.googleapis.com/v1');

			// Mock etag fetch for update
			mock
				.get('/people/c123456789')
				.query({
					personFields: 'Names',
				})
				.reply(200, {
					resourceName: 'people/c123456789',
					etag: '%EgYBAgMEBQYHCCESBCAFIAI=.',
					names: [
						{
							metadata: {
								primary: true,
								source: { type: 'CONTACT', id: 'c123456789' },
							},
							displayName: 'John Doe',
							familyName: 'Doe',
							givenName: 'John',
						},
					],
				});

			// Mock contact update with more flexible query matching
			mock
				.patch('/people/c123456789:updateContact')
				.query(true) // Match any query parameters
				.reply(200, {
					resourceName: 'people/c123456789',
					etag: '%EgYBAgMEBQYHCCESBCAFIAI=.',
					names: [
						{
							metadata: {
								primary: true,
								source: { type: 'CONTACT', id: 'c123456789' },
							},
							displayName: 'John Updated Doe',
							familyName: 'Doe',
							givenName: 'John Updated',
						},
					],
					emailAddresses: [
						{
							metadata: { primary: true, source: { type: 'CONTACT', id: 'c123456789' } },
							value: 'john.updated@example.com',
							type: 'work',
						},
					],
				});
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['contact-update.workflow.json'],
		});
	});
});
