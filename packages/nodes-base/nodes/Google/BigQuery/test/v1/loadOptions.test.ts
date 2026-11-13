import { mock, mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { GoogleBigQueryV1 } from '../../v1/GoogleBigQueryV1.node';

describe('Google BigQuery v1 loadOptions', () => {
	it('should encode the project ID in the request URL', async () => {
		const node = new GoogleBigQueryV1(mock<INodeTypeBaseDescription>());
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNodeParameter.mockReturnValue('oAuth2');
		context.getCurrentNodeParameter.mockReturnValue('test-project/datasets');
		context.helpers.requestOAuth2.mockResolvedValue({ datasets: [] });

		await node.methods.loadOptions.getDatasets.call(context);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'googleBigQueryOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://bigquery.googleapis.com/bigquery/v2/projects/test-project%2Fdatasets/datasets`,
			}),
		);
	});
});
