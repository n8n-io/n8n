import type { IExecuteFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import * as commentCreate from '../../../v2/actions/comment/create.operation';
import * as issueCreate from '../../../v2/actions/issue/create.operation';
import * as issueGet from '../../../v2/actions/issue/get.operation';
import * as issueGetAll from '../../../v2/actions/issue/getAll.operation';

describe('Linear v2 → Issue & Comment', () => {
	let mockThis: IExecuteFunctions;
	let apiRequestSpy: jest.SpyInstance;

	beforeEach(() => {
		mockThis = {
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: jest.fn(),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				returnJsonArray: jest.fn().mockImplementation((d) => [{ json: d }]),
				constructExecutionMetaData: jest.fn().mockImplementation((d) => d),
			},
		} as unknown as IExecuteFunctions;
	});

	afterEach(() => jest.restoreAllMocks());

	describe('issue.create', () => {
		it('sends issueCreate mutation with required fields', async () => {
			apiRequestSpy = jest
				.spyOn(GenericFunctions, 'linearApiRequest')
				.mockResolvedValue({ data: { issueCreate: { issue: { id: 'issue-1', title: 'Bug' } } } });

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'teamId') return 'team-abc';
				if (param === 'title') return 'Bug report';
				if (param === 'additionalFields') return {};
				return undefined;
			});

			await issueCreate.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('issueCreate'),
					variables: expect.objectContaining({ teamId: 'team-abc', title: 'Bug report' }),
				}),
			);
		});
	});

	describe('issue.getAll', () => {
		it('calls issues query and respects limit', async () => {
			const allItemsSpy = jest
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([{ id: 'issue-1' }, { id: 'issue-2' }]);

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'returnAll') return false;
				if (param === 'limit') return 10;
				if (param === 'filters') return {};
				return undefined;
			});

			await issueGetAll.execute.call(mockThis, [{ json: {} }]);

			expect(allItemsSpy).toHaveBeenCalledWith(
				'data.issues',
				expect.objectContaining({ query: expect.stringContaining('issues') }),
				10,
			);
		});

		it('passes undefined limit when returnAll is true', async () => {
			const allItemsSpy = jest
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([]);

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'returnAll') return true;
				if (param === 'filters') return {};
				return undefined;
			});

			await issueGetAll.execute.call(mockThis, [{ json: {} }]);

			expect(allItemsSpy).toHaveBeenCalledWith(
				'data.issues',
				expect.objectContaining({ query: expect.stringContaining('issues') }),
				undefined,
			);
		});
	});

	describe('issue.get', () => {
		it('sends issue query with correct ID', async () => {
			apiRequestSpy = jest
				.spyOn(GenericFunctions, 'linearApiRequest')
				.mockResolvedValue({ data: { issue: { id: 'issue-42', title: 'Test' } } });

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'issueId') return 'issue-42';
				return undefined;
			});

			await issueGet.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('issue'),
					variables: expect.objectContaining({ issueId: 'issue-42' }),
				}),
			);
		});
	});

	describe('comment.create', () => {
		it('sends commentCreate mutation with issueId and body', async () => {
			apiRequestSpy = jest.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { commentCreate: { id: 'comment-1', body: 'Hello' } },
			});

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'issueId') return 'issue-abc';
				if (param === 'body') return 'This is a comment';
				if (param === 'additionalFields') return {};
				return undefined;
			});

			await commentCreate.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('commentCreate'),
					variables: expect.objectContaining({ issueId: 'issue-abc', body: 'This is a comment' }),
				}),
			);
		});
	});
});
