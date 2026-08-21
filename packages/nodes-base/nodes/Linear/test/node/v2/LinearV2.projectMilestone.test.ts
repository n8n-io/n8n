import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import { getProjects } from '../../../shared/methods/listSearch';
import * as milestoneCreate from '../../../v2/actions/projectMilestone/create.operation';
import * as milestoneGetAll from '../../../v2/actions/projectMilestone/getAll.operation';
import * as updateCreate from '../../../v2/actions/projectUpdate/create.operation';
import * as updateGetAll from '../../../v2/actions/projectUpdate/getAll.operation';

describe('Linear v2 → Project Milestone & Project Update', () => {
	let mockThis: IExecuteFunctions;

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

	describe('projectMilestone.create', () => {
		it('sends projectMilestoneCreate with resolved projectId and name', async () => {
			const spy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { projectMilestoneCreate: { projectMilestone: { id: 'ms-1', name: 'M1' } } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'projectId') return 'proj-1';
				if (param === 'name') return 'M1';
				if (param === 'additionalFields') return { targetDate: '2026-09-01' };
				return undefined;
			});

			await milestoneCreate.execute.call(mockThis, [{ json: {} }]);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('projectMilestoneCreate'),
					variables: expect.objectContaining({
						name: 'M1',
						projectId: 'proj-1',
						targetDate: '2026-09-01',
					}),
				}),
			);
		});
	});

	describe('projectMilestone.getAll', () => {
		it('queries milestones scoped to the project', async () => {
			const spy = vi
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([{ id: 'ms-1' }]);

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'projectId') return 'proj-1';
				if (param === 'returnAll') return false;
				if (param === 'limit') return 20;
				return undefined;
			});

			await milestoneGetAll.execute.call(mockThis, [{ json: {} }]);

			expect(spy).toHaveBeenCalledWith(
				'data.project.projectMilestones',
				expect.objectContaining({ variables: expect.objectContaining({ projectId: 'proj-1' }) }),
				20,
			);
		});
	});

	describe('projectUpdate.create', () => {
		it('sends projectUpdateCreate with body and health', async () => {
			const spy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { projectUpdateCreate: { projectUpdate: { id: 'pu-1', health: 'onTrack' } } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'projectId') return 'proj-1';
				if (param === 'body') return 'Weekly status';
				if (param === 'additionalFields') return { health: 'atRisk' };
				return undefined;
			});

			await updateCreate.execute.call(mockThis, [{ json: {} }]);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('projectUpdateCreate'),
					variables: expect.objectContaining({
						projectId: 'proj-1',
						body: 'Weekly status',
						health: 'atRisk',
					}),
				}),
			);
		});
	});

	describe('projectUpdate.getAll', () => {
		it('queries updates scoped to the project', async () => {
			const spy = vi
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([{ id: 'pu-1' }]);

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'projectId') return 'proj-1';
				if (param === 'returnAll') return true;
				return undefined;
			});

			await updateGetAll.execute.call(mockThis, [{ json: {} }]);

			expect(spy).toHaveBeenCalledWith(
				'data.project.projectUpdates',
				expect.objectContaining({ variables: expect.objectContaining({ projectId: 'proj-1' }) }),
				undefined,
			);
		});
	});

	describe('listSearch.getProjects', () => {
		it('maps projects to results and forwards a name filter', async () => {
			const loadOptionsThis = {} as unknown as ILoadOptionsFunctions;
			const spy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: {
					projects: {
						nodes: [{ id: 'proj-1', name: 'Roadmap' }],
						pageInfo: { hasNextPage: false, endCursor: null },
					},
				},
			});

			const result = await getProjects.call(loadOptionsThis, 'Road');

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expect.objectContaining({ filter: { name: { containsIgnoreCase: 'Road' } } }),
				}),
			);
			expect(result.results).toEqual([{ name: 'Roadmap', value: 'proj-1' }]);
			expect(result.paginationToken).toBeUndefined();
		});
	});
});
