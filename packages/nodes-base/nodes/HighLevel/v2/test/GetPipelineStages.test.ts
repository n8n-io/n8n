import { getPipelineStages } from '../GenericFunctions';

const mockHighLevelApiRequest = jest.fn();
const mockGetNodeParameter = jest.fn();
const mockGetCurrentNodeParameter = jest.fn();
const mockGetCredentials = jest.fn();

const mockContext: any = {
	getNodeParameter: mockGetNodeParameter,
	getCurrentNodeParameter: mockGetCurrentNodeParameter,
	getCredentials: mockGetCredentials,
	helpers: {
		httpRequestWithAuthentication: mockHighLevelApiRequest,
	},
};

describe('getPipelineStages', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return pipeline stages for create operation', async () => {
		mockGetNodeParameter.mockReturnValue('create');
		mockGetCurrentNodeParameter.mockReturnValue('pipeline-1');
		mockHighLevelApiRequest.mockResolvedValue({
			pipelines: [
				{
					id: 'pipeline-1',
					stages: [
						{ id: 'stage-1', name: 'Stage 1' },
						{ id: 'stage-2', name: 'Stage 2' },
					],
				},
			],
		});

		const response = await getPipelineStages.call(mockContext);

		expect(response).toEqual([
			{ name: 'Stage 1', value: 'stage-1' },
			{ name: 'Stage 2', value: 'stage-2' },
		]);
	});

	it('should return pipeline stages for update operation', async () => {
		mockGetNodeParameter.mockImplementation((param) => {
			if (param === 'operation') return 'update';
			if (param === 'updateFields.pipelineId') return 'pipeline-2';
		});

		mockHighLevelApiRequest.mockResolvedValue({
			pipelines: [
				{
					id: 'pipeline-2',
					stages: [
						{ id: 'stage-3', name: 'Stage 3' },
						{ id: 'stage-4', name: 'Stage 4' },
					],
				},
			],
		});

		const response = await getPipelineStages.call(mockContext);

		expect(response).toEqual([
			{ name: 'Stage 3', value: 'stage-3' },
			{ name: 'Stage 4', value: 'stage-4' },
		]);
	});

	it('should return an empty array if pipeline is not found', async () => {
		mockGetNodeParameter.mockReturnValue('create');
		mockGetCurrentNodeParameter.mockReturnValue('non-existent-pipeline');
		mockHighLevelApiRequest.mockResolvedValue({
			pipelines: [
				{
					id: 'pipeline-1',
					stages: [{ id: 'stage-1', name: 'Stage 1' }],
				},
			],
		});

		const response = await getPipelineStages.call(mockContext);

		expect(response).toEqual([]);
	});
});
