import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { Spotify } from '../Spotify.node';

describe('Spotify - request URL encoding', () => {
	it('should encode a track ID with a slash as one path segment', async () => {
		const params: IDataObject = { resource: 'track', operation: 'get', id: 'abc/me' };
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({});

		await new Spotify().execute.call(context);

		expect(String(context.helpers.httpRequestWithAuthentication.mock.calls[0][1].url)).toBe(
			'https://api.spotify.com/v1/tracks/abc%2Fme',
		);
	});

	it('should reject a track ID with a dot segment', async () => {
		const params: IDataObject = { resource: 'track', operation: 'get', id: 'abc/../me' };
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);

		await expect(new Spotify().execute.call(context)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});
