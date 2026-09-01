import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { Readable } from 'stream';

import * as genericFunctions from '../../GenericFunctions';
import { YouTube } from '../../YouTube.node';
import type { MockInstance } from 'vitest';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../GenericFunctions');
	return {
		...originalModule,
		googleApiRequest: vi.fn(async function (method: string) {
			if (method === 'POST') {
				return {
					headers: { location: 'https://www.youtube.com/watch?v=1234' },
					body: { id: '1234' },
				};
			}

			return {};
		}),
	};
});

const httpRequestMock = vi.fn(() => ({ id: '5678' }));

describe('Test YouTube, video => upload', () => {
	let youTube: YouTube;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let fromSpy: MockInstance;

	beforeEach(() => {
		fromSpy = vi.spyOn(Readable, 'from');
		youTube = new YouTube();
		mockExecuteFunctions = mock<IExecuteFunctions>();
		const buffer = Buffer.alloc(2 * 1024 * 1024, 'a');
		mockExecuteFunctions.helpers = {
			constructExecutionMetaData: vi.fn(() => []),
			returnJsonArray: vi.fn(() => []),
			assertBinaryData: vi.fn(() => ({ data: buffer.toString('base64'), mimeType: 'video/mp4' })),
			httpRequest: httpRequestMock,
		} as any;
	});

	afterEach(() => {
		fromSpy.mockRestore();
		vi.clearAllMocks();
	});

	it('should create readable from buffer', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			switch (key) {
				case 'resource':
					return 'video';
				case 'operation':
					return 'upload';
				case 'title':
					return 'test';
				case 'categoryId':
					return '11';
				case 'options':
					return {};
				case 'binaryProperty':
					return 'data';
				default:
			}
		});

		await youTube.execute.call(mockExecuteFunctions);

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/upload/youtube/v3/videos',
			{
				recordingDetails: { recordingDate: undefined },
				snippet: {
					categoryId: '11',
					defaultLanguage: undefined,
					description: undefined,
					tags: undefined,
					title: 'test',
				},
				status: {
					embeddable: undefined,
					license: undefined,
					privacyStatus: undefined,
					publicStatsViewable: undefined,
					publishAt: undefined,
					selfDeclaredMadeForKids: undefined,
				},
			},
			{
				notifySubscribers: false,
				part: 'snippet,status,recordingDetails',
				uploadType: 'resumable',
			},
			undefined,
			{
				headers: { 'X-Upload-Content-Length': 2097152, 'X-Upload-Content-Type': 'video/mp4' },
				json: true,
				resolveWithFullResponse: true,
			},
		);

		expect(httpRequestMock).toHaveBeenCalledWith({
			body: expect.any(Object),
			headers: { 'Content-Length': 2097152, 'Content-Range': 'bytes 0-2097151/2097152' },
			method: 'PUT',
			url: 'https://www.youtube.com/watch?v=1234',
		});
		expect(fromSpy).toHaveBeenCalledTimes(1);
	});
});
