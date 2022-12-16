import {
	createDeferredPromise,
	IRun,
	Workflow,
	ILogger,
	LoggerProxy,
} from 'n8n-workflow';
import { WorkflowExecute } from '../../../../core/dist';
import * as Helpers from '../Helpers';
import { WorkflowTestData } from '../types';
import { readFileSync } from 'fs';
import nock from "nock"

import { ManualTrigger } from '../../../nodes/ManualTrigger/ManualTrigger.node';
import { Airtable } from '../../../nodes/Airtable/Airtable.node';

// import * as GenericFunctions from '../../../nodes/Airtable/GenericFunctions';


describe('Node', () => {
	describe('Airtable', () => {


		beforeEach(() => {
			nock.disableNetConnect();
		})

		afterEach(() => {
			nock.restore();
		})

		const records = [
			{
				id: "rec2BWBoyS5QsS7pT",
				createdTime: "2022-08-25T08:22:34.000Z",
				fields: {
					name: "Tim",
					email: "tim@email.com",
				},
			},
		];

		nock.disableNetConnect();

		nock('https://api.airtable.com/v0')
			.get('/appIaXXdDqS5ORr4V/tbljyBEdYzCPF0NDh?pageSize=100')
			.reply(200, { records });


		// jest.spyOn(GenericFunctions, 'apiRequest').mockImplementation(() => {
		// 	console.log('MOCK #######################');
		// 	return Promise.resolve(records);
		// });

		const tests: Array<WorkflowTestData> = [
			{
				description: 'List Airtable Records',
				input: {
					workflowData: JSON.parse(readFileSync('test/nodes/Airtable/workflow.json', 'utf-8')),
				},
				output: {
					nodeData: {
						"Airtable": [
							[
								...records
							],
						],
					},
				},
			},
		];

		const fakeLogger = {
			log: () => { },
			debug: () => { },
			verbose: () => { },
			info: () => { },
			warn: () => { },
			error: () => { },
		} as ILogger;

		const executionMode = 'manual';
		Helpers.NodeTypes().addNode('n8n-nodes-base.manualTrigger', new ManualTrigger());
		Helpers.NodeTypes().addNode('n8n-nodes-base.airtable', new Airtable());

		const nodeTypes = Helpers.NodeTypes();
		LoggerProxy.init(fakeLogger);

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
				});

				const waitPromise = await createDeferredPromise<IRun>();
				const nodeExecutionOrder: string[] = [];
				const additionalData = Helpers.WorkflowExecuteAdditionalData(
					waitPromise,
					nodeExecutionOrder,
				);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);
				const result = await waitPromise.promise();

				// console.log('resultData', JSON.stringify(result, null, 2));

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new Error(`Data for node "${nodeName}" is missing!`);
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
						if (nodeData.data === undefined) {
							return null;
						}
						return nodeData.data.main[0]!.map((entry) => entry.json);
					});
					// expect(resultData).toEqual(testData.output.nodeData[nodeName]);
					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
			});
		}
	});
});
