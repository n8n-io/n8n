import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import {
	deleteLightResponse,
	getLightsResponse,
	getConfigResponse,
	updateLightResponse,
} from './apiResponses';

describe('PhilipsHue', () => {
	const credentials = {
		philipsHueOAuth2Api: {
			grantType: 'authorizationCode',
			appId: 'APPID',
			authUrl: 'https://api.meethue.com/v2/oauth2/authorize',
			accessTokenUrl: 'https://api.meethue.com/v2/oauth2/token',
			authQueryParameters: 'appid=APPID',
			scope: '',
			authentication: 'header',
			oauthTokenData: {
				access_token: 'ACCESSTOKEN',
				refresh_token: 'REFRESHTOKEN',
				scope: '',
				token_type: 'bearer',
				expires_in: 86400,
			},
		},
	};

	describe('Run workflow', () => {
		beforeAll(() => {
			const mock = nock('https://api.meethue.com/route');
			mock.persist().get('/api/0/config').reply(200, getConfigResponse);
			mock.get('/api/pAtwdCV8NZId25Gk/lights').reply(200, getLightsResponse);
			mock.put('/api/pAtwdCV8NZId25Gk/lights/1/state').reply(200, updateLightResponse);
			mock.delete('/api/pAtwdCV8NZId25Gk/lights/1').reply(200, deleteLightResponse);
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
