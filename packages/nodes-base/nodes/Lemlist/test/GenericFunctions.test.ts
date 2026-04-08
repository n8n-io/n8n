import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
} from 'n8n-workflow';

import { lemlistApiRequest, lemlistApiRequestAllItems, getEvents } from '../GenericFunctions';

describe('GenericFunctions', () => {
	describe('lemlistApiRequest', () => {
		const mockThis = {
			helpers: {
				requestWithAuthentication: jest.fn(),
			},
		} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

		it('should make an authenticated API request to Lemlist', async () => {
			const method: IHttpRequestMethods = 'GET';
			const endpoint = '/test-endpoint';
			const body: IDataObject = { key: 'value' };
			const qs: IDataObject = { query: 'value' };
			const option: IDataObject = { headers: {} };

			await lemlistApiRequest.call(mockThis, method, endpoint, body, qs, option);

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('lemlistApi', {
				headers: {},
				method: 'GET',
				uri: 'https://api.lemlist.com/api/test-endpoint',
				qs: { query: 'value' },
				body: { key: 'value' },
				json: true,
			});
		});
	});

	describe('lemlistApiRequestAllItems', () => {
		const mockThis = {
			helpers: {
				requestWithAuthentication: jest
					.fn()
					.mockResolvedValue([{ id: 'cam_A1B2C3D4E5F6G7H8I9' }, { id: 'cam_A1B2C3D4E5F6G7H8I8' }]),
			},
		} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

		it('should return all results', async () => {
			const method: IHttpRequestMethods = 'GET';
			const endpoint = '/test-endpoint';
			const qs: IDataObject = {};
			qs.version = 'v2';

			const result = await lemlistApiRequestAllItems.call(mockThis, method, endpoint, qs);

			expect(result).toEqual([{ id: 'cam_A1B2C3D4E5F6G7H8I9' }, { id: 'cam_A1B2C3D4E5F6G7H8I8' }]);
		});
	});

	describe('getEvents', () => {
		it('should return a list of events with capitalized names', () => {
			const expectedEvents = [
				{ name: '*', value: '*' },
				{ name: 'Contacted', value: 'contacted' },
				{ name: 'Hooked', value: 'hooked' },
				{ name: 'Attracted', value: 'attracted' },
				{ name: 'Warmed', value: 'warmed' },
				{ name: 'Interested', value: 'interested' },
				{ name: 'Skipped', value: 'skipped' },
				{ name: 'Not Interested', value: 'notInterested' },
				{ name: 'Emails Sent', value: 'emailsSent' },
				{ name: 'Emails Opened', value: 'emailsOpened' },
				{ name: 'Emails Clicked', value: 'emailsClicked' },
				{ name: 'Emails Replied', value: 'emailsReplied' },
				{ name: 'Emails Bounced', value: 'emailsBounced' },
				{ name: 'Emails Send Failed', value: 'emailsSendFailed' },
				{ name: 'Emails Failed', value: 'emailsFailed' },
				{ name: 'Emails Unsubscribed', value: 'emailsUnsubscribed' },
				{ name: 'Emails Interested', value: 'emailsInterested' },
				{ name: 'Emails Not Interested', value: 'emailsNotInterested' },
				{ name: 'Opportunities Done', value: 'opportunitiesDone' },
				{ name: 'Aircall Created', value: 'aircallCreated' },
				{ name: 'Aircall Ended', value: 'aircallEnded' },
				{ name: 'Aircall Done', value: 'aircallDone' },
				{ name: 'Aircall Interested', value: 'aircallInterested' },
				{ name: 'Aircall Not Interested', value: 'aircallNotInterested' },
				{ name: 'Api Done', value: 'apiDone' },
				{ name: 'Api Interested', value: 'apiInterested' },
				{ name: 'Api Not Interested', value: 'apiNotInterested' },
				{ name: 'Api Failed', value: 'apiFailed' },
				{ name: 'LinkedIn Visit Done', value: 'linkedinVisitDone' },
				{ name: 'LinkedIn Visit Failed', value: 'linkedinVisitFailed' },
				{ name: 'LinkedIn Invite Done', value: 'linkedinInviteDone' },
				{ name: 'LinkedIn Invite Failed', value: 'linkedinInviteFailed' },
				{ name: 'LinkedIn Invite Accepted', value: 'linkedinInviteAccepted' },
				{ name: 'LinkedIn Replied', value: 'linkedinReplied' },
				{ name: 'LinkedIn Sent', value: 'linkedinSent' },
				{ name: 'LinkedIn Voice Note Done', value: 'linkedinVoiceNoteDone' },
				{ name: 'LinkedIn Voice Note Failed', value: 'linkedinVoiceNoteFailed' },
				{ name: 'LinkedIn Interested', value: 'linkedinInterested' },
				{ name: 'LinkedIn Not Interested', value: 'linkedinNotInterested' },
				{ name: 'LinkedIn Send Failed', value: 'linkedinSendFailed' },
				{ name: 'Manual Interested', value: 'manualInterested' },
				{ name: 'Manual Not Interested', value: 'manualNotInterested' },
				{ name: 'Paused', value: 'paused' },
				{ name: 'Resumed', value: 'resumed' },
				{ name: 'Custom Domain Errors', value: 'customDomainErrors' },
				{ name: 'Connection Issue', value: 'connectionIssue' },
				{ name: 'Send Limit Reached', value: 'sendLimitReached' },
				{ name: 'Lemwarm Paused', value: 'lemwarmPaused' },
			];
			const result = getEvents();
			expect(result).toEqual(expectedEvents);
		});
	});
});
