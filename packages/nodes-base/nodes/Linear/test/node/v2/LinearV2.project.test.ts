import type { IExecuteFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import * as labelCreate from '../../../v2/actions/label/create.operation';
import * as projectCreate from '../../../v2/actions/project/create.operation';
import * as teamGetAll from '../../../v2/actions/team/getAll.operation';
import * as userGetCurrent from '../../../v2/actions/user/getCurrent.operation';

describe('Linear v2 → Project, User, Team & Label', () => {
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

	describe('project.create', () => {
		it('sends projectCreate mutation with name and teamIds', async () => {
			apiRequestSpy = jest.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { projectCreate: { project: { id: 'proj-1', name: 'My Project' } } },
			});

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'name') return 'My Project';
				if (param === 'teamIds') return ['team-abc'];
				if (param === 'additionalFields') return {};
				return undefined;
			});

			await projectCreate.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('projectCreate'),
					variables: expect.objectContaining({ name: 'My Project', teamIds: ['team-abc'] }),
				}),
			);
		});
	});

	describe('user.getCurrent', () => {
		it('sends viewer query with no variables', async () => {
			apiRequestSpy = jest.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { viewer: { id: 'user-1', displayName: 'Alice' } },
			});

			await userGetCurrent.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('viewer'),
				}),
			);
		});
	});

	describe('team.getAll', () => {
		it('calls teams query', async () => {
			const allItemsSpy = jest
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([{ id: 'team-1', name: 'Engineering' }]);

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'returnAll') return false;
				if (param === 'limit') return 50;
				return undefined;
			});

			await teamGetAll.execute.call(mockThis, [{ json: {} }]);

			expect(allItemsSpy).toHaveBeenCalledWith(
				'data.teams',
				expect.objectContaining({ query: expect.stringContaining('teams') }),
				50,
			);
		});
	});

	describe('label.create', () => {
		it('sends issueLabelCreate mutation with name and teamId', async () => {
			apiRequestSpy = jest.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { issueLabelCreate: { issueLabel: { id: 'label-1', name: 'Bug' } } },
			});

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'name') return 'Bug';
				if (param === 'teamId') return 'team-xyz';
				if (param === 'additionalFields') return {};
				return undefined;
			});

			await labelCreate.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('issueLabelCreate'),
					variables: expect.objectContaining({ name: 'Bug', teamId: 'team-xyz' }),
				}),
			);
		});
	});
});
