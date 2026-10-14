import type {
	ILoadOptionsFunctions,
	INodeTypeBaseDescription,
	IRequestOptions,
} from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { LemlistTrigger } from '../LemlistTrigger.node';
import { LemlistV1 } from '../v1/LemlistV1.node';
import { LemlistV2 } from '../v2/LemlistV2.node';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Lemlist',
	name: 'lemlist',
	group: ['transform'],
	description: 'Consume the Lemlist API',
};

describe.each([
	['Lemlist Trigger', new LemlistTrigger()],
	['Lemlist v1', new LemlistV1(baseDescription)],
	['Lemlist v2', new LemlistV2(baseDescription)],
])('%s', (_name, node) => {
	describe('loadOptions.getCampaigns', () => {
		// NODE-6143: Campaigns after the first 100 must also appear in the dropdown.
		it.each([2, 101])('should load all %i campaigns into the dropdown', async (count) => {
			const context = mockDeep<ILoadOptionsFunctions>();
			const campaigns = Array.from({ length: count }, (_, index) => ({
				_id: `cam_${index + 1}`,
				name: `Campaign ${index + 1}`,
			}));

			context.helpers.requestWithAuthentication.mockImplementation(
				async (_credentialType, requestOptions: IRequestOptions) => {
					const offset = Number(requestOptions.qs?.offset ?? 0);
					const limit = Math.min(Number(requestOptions.qs?.limit ?? 100), 100);
					return campaigns.slice(offset, offset + limit);
				},
			);

			const options = await node.methods.loadOptions.getCampaigns.call(context);

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'lemlistApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://api.lemlist.com/api/campaigns',
				}),
			);
			expect(options.length).toBe(campaigns.length);
			expect(options).toEqual(
				campaigns.map((campaign) => ({ name: campaign.name, value: campaign._id })),
			);
		});
	});
});
