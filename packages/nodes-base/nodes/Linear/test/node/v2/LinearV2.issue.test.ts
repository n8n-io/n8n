import type { IExecuteFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import * as commentCreate from '../../../v2/actions/comment/create.operation';
import * as issueCreate from '../../../v2/actions/issue/create.operation';
import * as issueGet from '../../../v2/actions/issue/get.operation';
import * as issueGetAll from '../../../v2/actions/issue/getAll.operation';

describe('Linear v2 → Issue & Comment', () => {
	let mockThis: IExecuteFunctions;
	let apiRequestSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockThis = {
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: vi.fn(),
			continueOnFail: vi.fn().mockReturnValue(false),
			helpers: {
				returnJsonArray: vi.fn().mockImplementation((d) => [{ json: d }]),
				constructExecutionMetaData: vi.fn().mockImplementation((d) => d),
			},
		} as unknown as IExecuteFunctions;
	});

	afterEach(() => vi.restoreAllMocks());

	describe('issue.create', () => {
		it('sends issueCreate mutation with required fields', async () => {
			apiRequestSpy = vi
				.spyOn(GenericFunctions, 'linearApiRequest')
				.mockResolvedValue({ data: { issueCreate: { issue: { id: 'issue-1', title: 'Bug' } } } });

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
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
			const allItemsSpy = vi
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([{ id: 'issue-1' }, { id: 'issue-2' }]);

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
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
			const allItemsSpy = vi
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([]);

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
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
			apiRequestSpy = vi
				.spyOn(GenericFunctions, 'linearApiRequest')
				.mockResolvedValue({ data: { issue: { id: 'issue-42', title: 'Test' } } });

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
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
			apiRequestSpy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { commentCreate: { id: 'comment-1', body: 'Hello' } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
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
