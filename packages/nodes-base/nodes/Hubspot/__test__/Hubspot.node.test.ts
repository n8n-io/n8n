/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

import companies from './fixtures/companies.json';
import companiesSearchResult from './fixtures/companies_search_result.json';
import contacts from './fixtures/contacts.json';
import contactsSearchResult from './fixtures/contacts_search_result.json';
import deals from './fixtures/deals.json';
import dealsSearchResult from './fixtures/deals_search_result.json';

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

		testWorkflows(['nodes/Hubspot/__test__/companies.workflow.json']);

		it('should make the correct network calls', () => {
			hubspotNock.done();
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
				.reply(200, contacts.contacts[0]);
		});

		testWorkflows(['nodes/Hubspot/__test__/contacts.workflow.json']);

		it('should make the correct network calls', () => {
			hubspotNock.done();
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

		testWorkflows(['nodes/Hubspot/__test__/deals.workflow.json']);

		it('should make the correct network calls', () => {
			hubspotNock.done();
		});
	});
});
