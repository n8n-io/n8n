/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import companies from './fixtures/companies.json';
import companiesSearchResult from './fixtures/companies_search_result.json';
import contacts from './fixtures/contacts.json';
import contactsSearchResult from './fixtures/contacts_search_result.json';
import deals from './fixtures/deals.json';
import dealsSearchResult from './fixtures/deals_search_result.json';
import engagements from './fixtures/engagements.json';

describe('Hubspot Node', () => {
	nock.disableNetConnect();

	const hubspotNock = nock('https://api.hubapi.com');

	describe('companies', () => {
		beforeAll(() => {
			hubspotNock
				.delete('/crm/v3/objects/companies/123', {})
				.reply(200, companies.companies[0])
				.post('/companies/v2/companies', {
					properties: [
						{
							name: 'name',
							value: 'test',
						},
						{
							name: 'about_us',
							value: 'test about us',
						},
						{
							name: 'annualrevenue',
							value: '123',
						},
						{
							name: 'city',
							value: 'Gent',
						},
						{
							name: 'closedate',
							value: 1744848000000,
						},
						{
							name: 'domain',
							value: 'example.com',
						},
						{
							name: 'hubspot_owner_id',
							value: '123',
						},
						{
							name: 'country',
							value: 'Belgium',
						},
						{
							name: 'description',
							value: 'test description',
						},
						{
							name: 'is_public',
							value: true,
						},
						{
							name: 'zip',
							value: '9000',
						},
						{
							name: 'twitterhandle',
							value: 'x',
						},
						{
							name: 'website',
							value: 'example.com',
						},
						{
							name: 'founded_year',
							value: '2000',
						},
						{
							name: 'test_custom_prop_name',
							value: 'test custom prop value',
						},
					],
				})
				.reply(200, companies.companies[0])
				.put('/companies/v2/companies/123', {
					properties: [
						{
							name: 'about_us',
							value: 'test about us',
						},
						{
							name: 'city',
							value: 'Gent',
						},
					],
				})
				.reply(200, companies.companies[0])
				.post('/companies/v2/domains/n8n.io/companies', { requestOptions: {}, limit: 100 })
				.reply(200, companiesSearchResult)
				.get('/companies/v2/companies/paged')
				.query(
					'properties=name&properties=description&properties=country&propertyMode=value_and_history&limit=2',
				)
				.reply(200, companies)
				.get('/companies/v2/companies/recent/modified')
				.query('since=1744243200000&count=2')
				.reply(200, { results: companies.companies })
				.get('/companies/v2/companies/123')
				.reply(200, companies.companies[0]);
		});

		afterAll(() => hubspotNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: ['companies.workflow.json'],
		});
	});

	describe('contacts', () => {
		beforeAll(() => {
			hubspotNock
				.delete('/contacts/v1/contact/vid/123', {})
				.reply(200, contacts.contacts[0])
				.post('/contacts/v1/contact/createOrUpdate/email/elias@n8n.io', {
					properties: [
						{
							property: 'annualrevenue',
							value: '123',
						},
						{
							property: 'city',
							value: 'Gent',
						},
						{
							property: 'closedate',
							value: 1744848000000,
						},
						{
							property: 'firstname',
							value: 'Elias',
						},
						{
							property: 'zip',
							value: '9000',
						},
						{
							property: 'website',
							value: 'example.com',
						},
						{
							property: 'work_email',
							value: 'elias@n8n.io',
						},
						{
							property: 'test_custom_prop_name',
							value: 'test custom prop value',
						},
					],
				})
				.reply(200, contacts.contacts[0])
				.put('/crm-associations/v1/associations/create-batch')
				.reply(200, {})
				.post('/crm/v3/objects/contacts/search', {
					sorts: [
						{
							propertyName: 'createdate',
							direction: 'ASCENDING',
						},
					],
					filterGroups: [
						{
							filters: [
								{
									propertyName: 'firstname',
									operator: 'EQ',
									value: 'Elias',
								},
								{
									propertyName: 'lastname',
									operator: 'EQ',
									value: 'Meire',
								},
							],
						},
						{
							filters: [
								{
									propertyName: 'email',
									operator: 'CONTAINS_TOKEN',
									value: 'n8n.io',
								},
							],
						},
					],
					direction: 'ASCENDING',
					limit: 2,
				})
				.reply(200, contactsSearchResult)
				.get('/contacts/v1/lists/all/contacts/all?count=2')
				.reply(200, contacts)
				.get('/contacts/v1/lists/recently_updated/contacts/recent?count=2')
				.reply(200, contacts)
				.get('/contacts/v1/contact/vid/204727/profile')
				.reply(200, contacts.contacts[0])
				.get('/contacts/v1/contact/vid/123/profile')
				.query('formSubmissionMode=newest&showListMemberships=true')
				.reply(200, contacts.contacts[0])
				.post('/contacts/v1/contact/createOrUpdate/email/test1@test.com', {
					properties: [],
				})
				.reply(200, contacts.contacts[0])
				.get('/contacts/v1/contact/vid/204727/profile')
				.reply(200, contacts.contacts[0])
				.post('/contacts/v1/contact/createOrUpdate/email/test2@test.com', {
					properties: [
						{
							property: 'hs_buying_role',
							value: 'CHAMPION;INFLUENCER',
						},
						{
							property: 'hs_country_region_code',
							value: 'US',
						},
						{
							property: 'hs_email_customer_quarantined_reason',
							value: 'BLOCKLIST_REMEDIATION',
						},
						{
							property: 'hs_role',
							value: 'consulting',
						},
						{
							property: 'hs_seniority',
							value: 'director',
						},
						{
							property: 'hs_sub_role',
							value: 'account_manager',
						},
						{
							property: 'hs_enriched_email_bounce_detected',
							value: true,
						},
						{
							property: 'hs_inferred_language_codes',
							value: 'en',
						},
						{
							property: 'hs_latest_source',
							value: 'OTHER_CAMPAIGNS',
						},
						{
							property: 'hs_latest_source_timestamp',
							value: 1735689600000,
						},
						{
							property: 'hs_linkedin_url',
							value: 'https://linkedin.com/foo',
						},
						{
							property: 'hs_content_membership_email',
							value: 'member@test.com',
						},
						{
							property: 'military_status',
							value: 'Foo',
						},
						{
							property: 'hs_persona',
							value: 'persona_1',
						},
						{
							property: 'hs_prospecting_agent_last_enrolled',
							value: 1738368000000,
						},
						{
							property: 'hs_prospecting_agent_total_enrolled_count',
							value: 2,
						},
						{
							property: 'hs_state_code',
							value: 'CA',
						},
						{
							property: 'hs_timezone',
							value: 'us_slash_pacific',
						},
						{
							property: 'hs_whatsapp_phone_number',
							value: '123456789',
						},
					],
				})
				.reply(200, contacts.contacts[0])
				.get('/contacts/v1/contact/vid/204727/profile')
				.reply(200, contacts.contacts[0]);
		});

		afterAll(() => hubspotNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: ['contacts.workflow.json'],
		});
	});

	describe('deals', () => {
		beforeAll(() => {
			hubspotNock
				.delete('/deals/v1/deal/123', {})
				.reply(200, deals.deals[0])
				.post('/deals/v1/deal', {
					properties: [
						{ name: 'dealstage', value: 'test stage name' },
						{ name: 'dealname', value: 'Test Deal' },
						{ name: 'closedate', value: 1744848000000 },
						{ name: 'amount', value: '100' },
						{ name: 'pipeline', value: 'test pipeline name' },
						{ name: 'description', value: 'Test Deal Desc' },
						{ name: 'test_custom_prop_name', value: 'test custom prop value' },
					],
					associations: {},
				})
				.reply(200, deals.deals[0])
				.put('/deals/v1/deal/123')
				.reply(200, deals.deals[0])
				.get('/deals/v1/deal/paged?includeAssociations=true&limit=2')
				.reply(200, deals)
				.get(
					'/deals/v1/deal/recent/created?since=1745193600000&includePropertyVersions=true&count=2',
				)
				.reply(200, { results: deals.deals })
				.get('/deals/v1/deal/123')
				.reply(200, deals.deals[0])
				.post('/crm/v3/objects/deals/search', {
					sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
					filterGroups: [
						{ filters: [{ propertyName: 'name', operator: 'EQ', value: 'Test Deal Name' }] },
					],
					direction: 'ASCENDING',
					sortBy: 'createdate',
					limit: 2,
				})
				.reply(200, dealsSearchResult);
		});

		afterAll(() => hubspotNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: ['deals.workflow.json'],
		});
	});

	describe('engagements', () => {
		beforeAll(() => {
			hubspotNock
				.post('/engagements/v1/engagements', engagements.request.createWithOwnerId)
				.reply(200, engagements.response.createWithOwnerId)
				.post('/engagements/v1/engagements', engagements.request.createWithoutOwnerId)
				.reply(200, engagements.response.createWithoutOwnerId)
				.post('/engagements/v1/engagements', engagements.request.createV2_1)
				.reply(200, engagements.response.createV2_1);
		});

		afterAll(() => hubspotNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: ['engagements.workflow.json'],
		});
	});

	describe('request URLs', () => {
		const contactList = { updated: [204727], discarded: [], invalidVids: [], invalidEmails: [] };
		const engagement = {
			engagement: { id: 29090716, type: 'TASK' },
			associations: {},
			metadata: {},
		};
		const ticket = { objectId: 176602, properties: { subject: { value: 'Printer issue' } } };
		const company = { companyId: 5832271, properties: { name: { value: 'Acme Corp' } } };
		const deal = { dealId: 1645820, properties: { dealname: { value: 'Acme deal' } } };
		const formFields = [{ name: 'email', label: 'Email' }];
		const formSubmit = { inlineMessage: 'Thanks for submitting the form.' };
		const formsNock = nock('https://api.hsforms.com');

		beforeAll(() => {
			hubspotNock
				.post('/contacts/v1/lists/7/add', { emails: [], vids: [204727] })
				.reply(200, contactList)
				.post('/contacts/v1/lists/7/remove', { vids: [204727] })
				.reply(200, contactList)
				.get('/engagements/v1/engagements/29090716')
				.reply(200, engagement)
				.delete('/engagements/v1/engagements/29090716')
				.reply(204)
				.get('/crm-objects/v1/objects/tickets/176602')
				.reply(200, ticket)
				.put('/crm-objects/v1/objects/tickets/176602', [
					{ name: 'subject', value: 'Printer issue' },
				])
				.reply(200, ticket)
				.delete('/crm-objects/v1/objects/tickets/176602')
				.reply(204)
				.post('/contacts/v1/lists/8/add', { emails: [], vids: [204728] })
				.reply(200, contactList)
				.post('/contacts/v1/lists/8/remove', { vids: [204728] })
				.reply(200, contactList)
				.delete('/contacts/v1/contact/vid/204728')
				.reply(200, { vid: 204728, deleted: true })
				.get('/companies/v2/companies/5832272')
				.reply(200, company)
				.put('/companies/v2/companies/5832272', {
					properties: [{ name: 'name', value: 'Acme Corp' }],
				})
				.reply(200, company)
				.post('/companies/v2/domains/acme.example.com/companies', {
					requestOptions: {},
					limit: 2,
				})
				.reply(200, { results: [company] })
				.get('/deals/v1/deal/1645821')
				.reply(200, deal)
				.put('/deals/v1/deal/1645821', {
					properties: [{ name: 'dealname', value: 'Acme deal' }],
				})
				.reply(200, deal)
				.get('/engagements/v1/engagements/29090717')
				.reply(200, engagement)
				.delete('/engagements/v1/engagements/29090717')
				.reply(204)
				.get('/forms/v2/fields/b1b2c3d4-5e6f-4a1b-8c2d-3e4f5a6b7c8d')
				.reply(200, formFields)
				.get('/forms/v2/forms/b1b2c3d4-5e6f-4a1b-8c2d-3e4f5a6b7c8d')
				.reply(200, { portalId: 62516 })
				.get('/crm-objects/v1/objects/tickets/176603')
				.reply(200, ticket)
				.put('/crm-objects/v1/objects/tickets/176603', [
					{ name: 'subject', value: 'Printer issue' },
				])
				.reply(200, ticket)
				.delete('/crm-objects/v1/objects/tickets/176603')
				.reply(204)
				.post('/contacts/v1/contact/createOrUpdate/email/a%2Bb@example.com', { properties: [] })
				.reply(200, { vid: 1 })
				.post('/contacts/v1/contact/createOrUpdate/email/c%2Bd@example.com', { properties: [] })
				.reply(200, { vid: 2 })
				.get('/contacts/v1/contact/vid/2/profile')
				.reply(200, { vid: 2 })
				.post('/contacts/v1/contact/createOrUpdate/email/e%252Bf@example.com', { properties: [] })
				.reply(200, { vid: 3 })
				.get('/contacts/v1/contact/vid/3/profile')
				.reply(200, { vid: 3 });
			formsNock
				.post('/submissions/v3/integration/submit/62516/b1b2c3d4-5e6f-4a1b-8c2d-3e4f5a6b7c8d')
				.reply(200, formSubmit);
		});

		afterAll(() => {
			hubspotNock.done();
			formsNock.done();
		});

		new NodeTestHarness().setupTests({
			credentials: { hubspotAppToken: { appToken: 'fake-token' } },
			workflowFiles: ['requests.workflow.json'],
		});
	});
});
