import type { IExecuteFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import * as documentCreate from '../../../v2/actions/document/create.operation';
import * as teamMembershipCreate from '../../../v2/actions/teamMembership/create.operation';

describe('Linear v2 → Document & TeamMembership', () => {
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

	describe('document.create', () => {
		it('sends documentCreate mutation with title', async () => {
			apiRequestSpy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { documentCreate: { document: { id: 'doc-1', title: 'Spec' } } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
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
			apiRequestSpy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { documentCreate: { document: { id: 'doc-2', title: 'Roadmap doc' } } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
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

	describe('teamMembership.create', () => {
		it('sends teamMembershipCreate mutation with userId and teamId', async () => {
			apiRequestSpy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: {
					teamMembershipCreate: { teamMembership: { id: 'mem-1', team: { id: 'team-1' } } },
				},
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
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
