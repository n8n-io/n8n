import type { IExecuteFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import * as documentCreate from '../../../v2/actions/document/create.operation';
import * as roadmapGetAll from '../../../v2/actions/roadmap/getAll.operation';
import * as teamMembershipCreate from '../../../v2/actions/teamMembership/create.operation';

describe('Linear v2 → Document, Roadmap & TeamMembership', () => {
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

	describe('document.create', () => {
		it('sends documentCreate mutation with title', async () => {
			apiRequestSpy = jest.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { documentCreate: { document: { id: 'doc-1', title: 'Spec' } } },
			});

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'title') return 'Spec';
				if (param === 'additionalFields') return {};
				return undefined;
			});

			await documentCreate.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('documentCreate'),
					variables: expect.objectContaining({ title: 'Spec' }),
				}),
			);
		});

		it('includes projectId when provided in additionalFields', async () => {
			apiRequestSpy = jest.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { documentCreate: { document: { id: 'doc-2', title: 'Roadmap doc' } } },
			});

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'title') return 'Roadmap doc';
				if (param === 'additionalFields') return { projectId: 'proj-abc' };
				return undefined;
			});

			await documentCreate.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expect.objectContaining({ title: 'Roadmap doc', projectId: 'proj-abc' }),
				}),
			);
		});
	});

	describe('roadmap.getAll', () => {
		it('calls roadmaps query', async () => {
			const allItemsSpy = jest
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([{ id: 'road-1', name: 'Q1 Roadmap' }]);

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'returnAll') return false;
				if (param === 'limit') return 50;
				return undefined;
			});

			await roadmapGetAll.execute.call(mockThis, [{ json: {} }]);

			expect(allItemsSpy).toHaveBeenCalledWith(
				'data.roadmaps',
				expect.objectContaining({ query: expect.stringContaining('roadmaps') }),
				50,
			);
		});
	});

	describe('teamMembership.create', () => {
		it('sends teamMembershipCreate mutation with userId and teamId', async () => {
			apiRequestSpy = jest.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: {
					teamMembershipCreate: { teamMembership: { id: 'mem-1', team: { id: 'team-1' } } },
				},
			});

			(mockThis.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'teamId') return 'team-xyz';
				if (param === 'userId') return 'user-abc';
				return undefined;
			});

			await teamMembershipCreate.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('teamMembershipCreate'),
					variables: expect.objectContaining({ teamId: 'team-xyz', userId: 'user-abc' }),
				}),
			);
		});
	});
});
