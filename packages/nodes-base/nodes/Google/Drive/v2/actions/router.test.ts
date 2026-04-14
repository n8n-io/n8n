import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as fileResource from './file/File.resource';
import { router } from './router';

jest.mock('./drive/Drive.resource', () => ({}));
jest.mock('./fileFolder/FileFolder.resource', () => ({}));
jest.mock('./folder/Folder.resource', () => ({}));
jest.mock('./file/File.resource', () => ({
	download: {
		execute: jest.fn(),
	},
}));

describe('Google Drive V2 router', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns a paired error item for failed downloads when continueOnFail is enabled', async () => {
		jest.mocked(fileResource.download.execute).mockRejectedValue(new Error('Permission denied'));

		const executeFunctions = mock<IExecuteFunctions>({
			getInputData: jest.fn().mockReturnValue([{ json: { id: '123' } }]),
			getNodeParameter: jest
				.fn()
				.mockReturnValueOnce('file')
				.mockReturnValueOnce('download'),
			continueOnFail: jest.fn().mockReturnValue(true),
		});

		const result = await router.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: { error: 'Permission denied' },
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('rethrows failed downloads when continueOnFail is disabled', async () => {
		jest.mocked(fileResource.download.execute).mockRejectedValue(new Error('Permission denied'));

		const executeFunctions = mock<IExecuteFunctions>({
			getInputData: jest.fn().mockReturnValue([{ json: { id: '123' } }]),
			getNodeParameter: jest
				.fn()
				.mockReturnValueOnce('file')
				.mockReturnValueOnce('download'),
			continueOnFail: jest.fn().mockReturnValue(false),
		});

		await expect(router.call(executeFunctions)).rejects.toThrow('Permission denied');
	});
});
