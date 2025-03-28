/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import nock from 'nock';

import {
	setup,
	equalityTest,
	workflowToTests,
	getWorkflowFilenames,
} from '../../../../../../test/nodes/Helpers';
import {
	companyCreate,
	companyGet,
	companyGetMany,
	companyGetRecent,
	companySearch,
	companyUpdate,
} from '../../../apiResponses';

describe('Hubspot v2 > Company Workflows', () => {
	describe('Run workflow', () => {
		const workflows = getWorkflowFilenames(__dirname);
		const tests = workflowToTests(workflows);

		beforeAll(() => {
			const mock = nock('https://api.hubapi.com');
			mock.get('/companies/v2/companies/5253250005').reply(200, companyGet);
			mock
				.get('/companies/v2/companies/paged')
				.query({
					properties: 'name',
					propertyMode: 'value_and_history',
					limit: 1,
				})
				.reply(200, companyGetMany);
			mock
				.post('/companies/v2/companies', {
					properties: [
						{
							name: 'name',
							value: 'McTest',
						},
						{
							name: 'about_us',
							value: 'All About McTest',
						},
						{
							name: 'annualrevenue',
							value: '10000',
						},
						{
							name: 'city',
							value: 'City',
						},
						{
							name: 'domain',
							value: 'domain.com',
						},
						{
							name: 'country',
							value: 'UK',
						},
						{
							name: 'description',
							value: 'A test company',
						},
						{
							name: 'facebookfans',
							value: 3,
						},
						{
							name: 'is_public',
							value: true,
						},
						{
							name: 'numberofemployees',
							value: 5,
						},
						{
							name: 'timezone',
							value: 'Europe/London',
						},
						{
							name: 'total_money_raised',
							value: 10,
						},
						{
							name: 'website',
							value: 'https://domain.com',
						},
					],
				})
				.reply(200, companyCreate);
			mock
				.post('/companies/v2/domains/domain.com/companies', {
					requestOptions: {
						properties: ['name'],
					},
					limit: 1,
				})
				.reply(200, companySearch);
			mock
				.get('/companies/v2/companies/recent/modified')
				.query({
					since: 1743120000000,
					properties: 'annualrevenue',
					propertyMode: 'value_and_history',
					count: 1,
				})
				.reply(200, companyGetRecent);
			mock
				.put('/companies/v2/companies/122422409462', {
					properties: [
						{
							name: 'about_us',
							value: 'New About',
						},
						{
							name: 'annualrevenue',
							value: '123456789',
						},
					],
				})
				.reply(200, companyUpdate);
			mock
				.delete('/crm/v3/objects/companies/122422409462')
				.reply(200, { deleted: true, vid: 122422409462 });
		});

		const nodeTypes = setup(tests);

		for (const testData of tests) {
			test(testData.description, async () => await equalityTest(testData, nodeTypes));
		}
	});
});
