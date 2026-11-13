import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const presentationId = '1EAYk18WDjIG-zp_0vLm3CsfQh_i8eXc67Jo2O9C6Vuc';
const slide = { objectId: 'g2a1b3c4d5e6_0_0', pageType: 'SLIDE' };

describe('Google Slides Node - request URLs', () => {
	beforeAll(() => {
		const presentation = `/v1/presentations/${presentationId}`;

		nock('https://slides.googleapis.com')
			.post('/v1/presentations', { title: 'Quarterly review' })
			.reply(200, { presentationId, title: 'Quarterly review' })
			.get(presentation)
			.reply(200, { presentationId, title: 'Quarterly review' })
			.get(presentation)
			.query({ fields: 'slides' })
			.reply(200, { slides: [slide] })
			.post(`${presentation}:batchUpdate`)
			.reply(200, { presentationId, replies: [{ replaceAllText: { occurrencesChanged: 1 } }] })
			.get(`${presentation}/pages/g2a1b3c4d5e6_0_0`)
			.reply(200, slide)
			.get(`${presentation}/pages/g2a1b3c4d5e6_0_0/thumbnail`)
			.reply(200, {
				width: 1600,
				height: 900,
				contentUrl: 'https://lh7-us.googleusercontent.com/thumb',
			});
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleSlidesOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/presentations',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['slides.workflow.json'],
	});
});
