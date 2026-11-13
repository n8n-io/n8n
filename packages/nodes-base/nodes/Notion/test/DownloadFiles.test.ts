import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { downloadFiles } from '../shared/GenericFunctions';

describe('Test Notion, downloadFiles', () => {
	it('requests the file URL with the same options as before', async () => {
		const context = mock<IExecuteFunctions>();
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		const request = vi.fn().mockResolvedValue(Buffer.from('content'));
		context.helpers = {
			request,
			requestWithAuthentication: vi.fn(),
			prepareBinaryData: vi.fn().mockResolvedValue({ data: 'Y29udGVudA==' }),
		} as unknown as IExecuteFunctions['helpers'];

		await downloadFiles.call(
			context,
			[
				{
					properties: {
						Attachments: {
							type: 'files',
							files: [{ file: { url: 'https://files.example.com/report.pdf?sig=abc' } }],
						},
					},
				},
			],
			[{ item: 0 }],
		);

		expect(request.mock.calls).toStrictEqual([
			[
				{
					headers: { 'Notion-Version': '2021-08-16' },
					method: 'GET',
					qs: {},
					uri: 'https://files.example.com/report.pdf?sig=abc',
					json: false,
					encoding: null,
				},
			],
		]);
		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});
});
