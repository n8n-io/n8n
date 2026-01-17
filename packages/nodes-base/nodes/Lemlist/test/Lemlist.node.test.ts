import nock from 'nock';

import {
	getCampaignsResponse,
	getCampaignResponse,
	createCampaignResponse,
	getCampaignStatsResponse,
	getLeadResponse,
	createLeadResponse,
	getLeadsResponse,
	getTeamResponse,
	getTeamCreditsResponse,
	getTeamSendersResponse,
	getActivitiesResponse,
	getUnsubscribesResponse,
	addUnsubscribeResponse,
	getEnrichmentResponse,
	enrichPersonResponse,
	getInboxResponse,
	sendEmailResponse,
	getTasksResponse,
	createTaskResponse,
	getCompaniesResponse,
	getContactsResponse,
	getWebhooksResponse,
	createWebhookResponse,
	getSchedulesResponse,
	getSequencesResponse,
	getPeopleSchemaResponse,
	searchPeopleResponse,
} from './apiResponses';

describe('Lemlist Node', () => {
	const baseUrl = 'https://api.lemlist.com/api';

	afterEach(() => {
		nock.cleanAll();
	});

	describe('Campaign operations', () => {
		it.todo('should get all campaigns');
		it.todo('should get a specific campaign');
		it.todo('should create a campaign');
		it.todo('should get campaign stats');
	});

	describe('Lead operations', () => {
		it.todo('should get a lead by email');
		it.todo('should create a lead');
		it.todo('should get all leads');
		it.todo('should pause a lead');
		it.todo('should resume a lead');
		it.todo('should mark a lead as interested');
	});

	describe('Team operations', () => {
		it.todo('should get team info');
		it.todo('should get team credits');
		it.todo('should get team senders');
	});

	describe('Activity operations', () => {
		it.todo('should get all activities');
	});

	describe('Unsubscribe operations', () => {
		it.todo('should get all unsubscribes');
		it.todo('should add an unsubscribe');
	});

	describe('Enrichment operations', () => {
		it.todo('should get an enrichment');
		it.todo('should enrich a person');
	});

	describe('Inbox operations', () => {
		it.todo('should get all inbox conversations');
		it.todo('should send an email');
	});

	describe('Task operations', () => {
		it.todo('should get all tasks');
		it.todo('should create a task');
	});

	describe('Company operations', () => {
		it.todo('should get all companies');
	});

	describe('Contact operations', () => {
		it.todo('should get all contacts');
	});

	describe('Webhook operations', () => {
		it.todo('should get all webhooks');
		it.todo('should create a webhook');
	});

	describe('Schedule operations', () => {
		it.todo('should get all schedules');
	});

	describe('Sequence operations', () => {
		it.todo('should get all sequences for a campaign');
	});

	describe('Database operations', () => {
		it.todo('should get people schema');
		it.todo('should search people database');
	});

	// Verify mock responses are properly structured
	describe('API Response structure validation', () => {
		it('should have valid campaign response structure', () => {
			expect(getCampaignsResponse).toBeDefined();
			expect(Array.isArray(getCampaignsResponse)).toBe(true);
			expect(getCampaignsResponse[0]).toHaveProperty('_id');
			expect(getCampaignsResponse[0]).toHaveProperty('name');
		});

		it('should have valid lead response structure', () => {
			expect(getLeadResponse).toBeDefined();
			expect(getLeadResponse).toHaveProperty('_id');
			expect(getLeadResponse).toHaveProperty('email');
		});

		it('should have valid team response structure', () => {
			expect(getTeamResponse).toBeDefined();
			expect(getTeamResponse).toHaveProperty('_id');
			expect(getTeamResponse).toHaveProperty('name');
		});

		it('should have valid enrichment response structure', () => {
			expect(enrichPersonResponse).toBeDefined();
			expect(enrichPersonResponse).toHaveProperty('_id');
		});

		it('should have valid search people response structure', () => {
			expect(searchPeopleResponse).toBeDefined();
			expect(searchPeopleResponse).toHaveProperty('results');
			expect(searchPeopleResponse).toHaveProperty('total');
		});
	});
});
