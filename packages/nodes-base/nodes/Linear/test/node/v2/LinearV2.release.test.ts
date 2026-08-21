import type { IExecuteFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import * as issueRelationCreate from '../../../v2/actions/issueRelation/create.operation';
import * as releaseCreate from '../../../v2/actions/release/create.operation';
import * as viewCreate from '../../../v2/actions/view/create.operation';

describe('Linear v2 → Release, Custom View & Issue Relation', () => {
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

	describe('release.create', () => {
		it('sends releaseCreate with name and pipelineId', async () => {
			const spy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { releaseCreate: { release: { id: 'rel-1', name: 'v1' } } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'name') return 'v1.0';
				if (param === 'pipelineId') return 'pipe-1';
				if (param === 'additionalFields') return { version: 'v1.0.0' };
				return undefined;
			});

			await releaseCreate.execute.call(mockThis, [{ json: {} }]);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('releaseCreate'),
					variables: expect.objectContaining({
						name: 'v1.0',
						pipelineId: 'pipe-1',
						version: 'v1.0.0',
					}),
				}),
			);
		});
	});

	describe('view.create', () => {
		it('sends customViewCreate with the name', async () => {
			const spy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { customViewCreate: { customView: { id: 'cv-1', name: 'My View' } } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'name') return 'My View';
				if (param === 'additionalFields') return { description: 'Saved filter' };
				return undefined;
			});

			await viewCreate.execute.call(mockThis, [{ json: {} }]);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('customViewCreate'),
					variables: expect.objectContaining({ name: 'My View', description: 'Saved filter' }),
				}),
			);
		});
	});

	describe('issueRelation.create', () => {
		it('sends issueRelationCreate with both issue IDs and the type', async () => {
			const spy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { issueRelationCreate: { issueRelation: { id: 'ir-1', type: 'blocks' } } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'issueId') return 'iss-1';
				if (param === 'relatedIssueId') return 'iss-2';
				if (param === 'type') return 'blocks';
				return undefined;
			});

			await issueRelationCreate.execute.call(mockThis, [{ json: {} }]);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('issueRelationCreate'),
					variables: { issueId: 'iss-1', relatedIssueId: 'iss-2', type: 'blocks' },
				}),
			);
		});
	});
});
