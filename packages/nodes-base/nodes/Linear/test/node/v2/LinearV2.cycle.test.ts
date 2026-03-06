import type { IExecuteFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import * as attachmentGet from '../../../v2/actions/attachment/get.operation';
import * as cycleCreate from '../../../v2/actions/cycle/create.operation';
import * as workflowStateGetAll from '../../../v2/actions/workflowState/getAll.operation';

describe('Linear v2 → Cycle, Attachment & WorkflowState', () => {
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

	describe('cycle.create', () => {
		it('sends cycleCreate mutation with teamId, startsAt, and endsAt', async () => {
			apiRequestSpy = jest.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { cycleCreate: { cycle: { id: 'cycle-1', number: 1 } } },
			});

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'teamId') return 'team-abc';
				if (param === 'startsAt') return '2024-01-01T00:00:00.000Z';
				if (param === 'endsAt') return '2024-01-14T00:00:00.000Z';
				if (param === 'additionalFields') return {};
				return undefined;
			});

			await cycleCreate.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('cycleCreate'),
					variables: expect.objectContaining({
						teamId: 'team-abc',
						startsAt: '2024-01-01T00:00:00.000Z',
						endsAt: '2024-01-14T00:00:00.000Z',
					}),
				}),
			);
		});
	});

	describe('attachment.get', () => {
		it('sends attachment query with correct ID', async () => {
			apiRequestSpy = jest.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { attachment: { id: 'att-1', url: 'https://example.com/file.pdf' } },
			});

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'attachmentId') return 'att-1';
				return undefined;
			});

			await attachmentGet.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('attachment'),
					variables: expect.objectContaining({ attachmentId: 'att-1' }),
				}),
			);
		});
	});

	describe('workflowState.getAll', () => {
		it('calls workflowStates query', async () => {
			const allItemsSpy = jest
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([{ id: 'state-1', name: 'In Progress' }]);

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'returnAll') return false;
				if (param === 'limit') return 50;
				if (param === 'filters') return {};
				return undefined;
			});

			await workflowStateGetAll.execute.call(mockThis, [{ json: {} }]);

			expect(allItemsSpy).toHaveBeenCalledWith(
				'data.workflowStates',
				expect.objectContaining({ query: expect.stringContaining('workflowStates') }),
				50,
			);
		});
	});
});
