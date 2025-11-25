import { migrateRunExecutionData } from '../../src/run-execution-data/run-execution-data';
import type { IRunExecutionDataV0 } from '../../src/run-execution-data/run-execution-data.v0';
import type { IRunExecutionDataV1 } from '../../src/run-execution-data/run-execution-data.v1';

describe('migrateRunExecutionData', () => {
	it('should migrate IRunExecutionDataV0 to V1', () => {
		const v0Data: IRunExecutionDataV0 = {
			version: 0,
			startData: {
				startNodes: [],
				destinationNode: 'TestNode',
				originalDestinationNode: 'OriginalTestNode',
				runNodeFilter: ['filter1'],
			},
			resultData: {
				runData: {},
				lastNodeExecuted: 'LastNode',
				metadata: { key: 'value' },
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: null,
			},
			validateSignature: true,
			pushRef: 'test-ref',
		};

		const result = migrateRunExecutionData(v0Data);

		expect(result).toEqual({
			...v0Data,
			version: 1,
			startData: {
				...v0Data.startData,
				destinationNode: {
					nodeName: 'TestNode',
					mode: 'inclusive',
				},
				originalDestinationNode: {
					nodeName: 'OriginalTestNode',
					mode: 'inclusive',
				},
			},
		});
	});

	it('should return V1 data unchanged (no-op)', () => {
		const v1Data: IRunExecutionDataV1 = {
			version: 1,
			startData: {
				startNodes: [],
				destinationNode: {
					nodeName: 'TestNode',
					mode: 'exclusive',
				},
				originalDestinationNode: {
					nodeName: 'OriginalTestNode',
					mode: 'inclusive',
				},
				runNodeFilter: ['filter1'],
			},
			resultData: {
				runData: {},
				lastNodeExecuted: 'LastNode',
				metadata: { key: 'value' },
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: null,
			},
			validateSignature: true,
			pushRef: 'test-ref',
		};

		const result = migrateRunExecutionData(v1Data);

		expect(result).toEqual(v1Data);
	});
});
