import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Webflow > Workflows', () => {
	const credentials = {
		webflowApi: { accessToken: 'test-access-token' },
		webflowOAuth2Api: {
			grantType: 'authorizationCode',
			authUrl: 'https://webflow.com/oauth/authorize',
			accessTokenUrl: 'https://api.webflow.com/oauth/access_token',
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			scope: '',
			authentication: 'body',
			oauthTokenData: { access_token: 'test-oauth-token', token_type: 'Bearer' },
		},
	};

	const collectionId = '580e63fc8c9a982ac9b8b745';
	const itemId = '580e64008c9a982ac9b8b754';
	const itemV2 = {
		id: itemId,
		cmsLocaleId: '653ad57de882f528b32e810e',
		isArchived: false,
		isDraft: false,
		fieldData: { name: 'Pan Galactic Gargle Blaster', slug: 'pan-galactic-gargle-blaster' },
	};
	const itemV1 = {
		_id: itemId,
		_archived: false,
		_draft: false,
		name: 'Pan Galactic Gargle Blaster',
		slug: 'pan-galactic-gargle-blaster',
	};
	const fieldDataV2 = { fieldData: { name: 'Pan Galactic Gargle Blaster' } };
	const fieldsV1 = { fields: { name: 'Pan Galactic Gargle Blaster' } };

	beforeAll(() => {
		const v2 = nock('https://api.webflow.com/v2');
		v2.post(`/collections/${collectionId}/items`, fieldDataV2).reply(200, itemV2);
		v2.post(`/collections/${collectionId}/items/live`, fieldDataV2).reply(200, itemV2);
		v2.get(`/collections/${collectionId}/items/${itemId}`).reply(200, itemV2);
		v2.get(`/collections/${collectionId}/items`)
			.query({ limit: 10 })
			.reply(200, {
				items: [itemV2],
				pagination: { limit: 10, offset: 0, total: 1 },
			});
		v2.get(`/collections/${collectionId}/items`)
			.query({ limit: 100, offset: 0 })
			.reply(200, {
				items: [itemV2],
				pagination: { limit: 100, offset: 0, total: 1 },
			});
		v2.patch(`/collections/${collectionId}/items/${itemId}`, fieldDataV2).reply(200, itemV2);
		v2.patch(`/collections/${collectionId}/items/${itemId}/live`, fieldDataV2).reply(200, itemV2);
		v2.delete(`/collections/${collectionId}/items/${itemId}`).reply(204);

		const v1 = nock('https://api.webflow.com');
		v1.post(`/collections/${collectionId}/items`, fieldsV1)
			.query({ live: true })
			.reply(200, itemV1);
		v1.get(`/collections/${collectionId}/items/${itemId}`).reply(200, {
			items: [itemV1],
			count: 1,
			limit: 1,
			offset: 0,
			total: 1,
		});
		v1.get(`/collections/${collectionId}/items`)
			.query({ limit: 10 })
			.reply(200, {
				items: [itemV1],
				count: 1,
				limit: 10,
				offset: 0,
				total: 1,
			});
		v1.get(`/collections/${collectionId}/items`)
			.query({ limit: 100, offset: 0 })
			.reply(200, {
				items: [itemV1],
				count: 1,
				limit: 100,
				offset: 0,
				total: 1,
			});
		v1.put(`/collections/${collectionId}/items/${itemId}`, fieldsV1)
			.query({ live: false })
			.reply(200, itemV1);
		v1.delete(`/collections/${collectionId}/items/${itemId}`).reply(200, { deleted: 1 });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['request-urls.workflow.json'] });
});
