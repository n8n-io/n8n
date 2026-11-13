import { mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { getDatasets } from '../../../v2/methods/loadOptions';

describe('Google BigQuery v2 loadOptions', () => {
	it('should encode the project ID in the request URL', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNodeParameter.mockImplementation((name) =>
			name === 'authentication' ? 'oAuth2' : 'test-project/datasets',
		);
		context.helpers.requestOAuth2.mockResolvedValue({ datasets: [] });

		await getDatasets.call(context);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'googleBigQueryOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://bigquery.googleapis.com/bigquery/v2/projects/test-project%2Fdatasets/datasets`,
			}),
		);
	});
});
