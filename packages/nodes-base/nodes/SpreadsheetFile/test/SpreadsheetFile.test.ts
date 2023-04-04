import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';

import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';
import path from 'path';

describe('Execute Spreadsheet File Node', () => {
	beforeEach(async () => {
		await Helpers.initBinaryDataManager();
	});

	// replace workflow json 'Read Binary File' node's filePath to local file
	const workflow = Helpers.readJsonFileSync('nodes/SpreadsheetFile/test/workflow.json');
	const node = workflow.nodes.find((n: any) => n.name === 'Read Binary File');
	node.parameters.filePath = path.join(__dirname, 'spreadsheet.csv');

	const tests: WorkflowTestData[] = [
		{
			description: 'execute workflow.json',
			input: {
				workflowData: workflow,
			},
			output: {
				nodeData: {
					'Read From File': [
						[
							{
								json: { A: 1, B: 2, C: 3 },
							},
							{
								json: { A: 4, B: 5, C: 6 },
							},
						],
					],
					'Read From File Range': [
						[
							{
								json: { '1': 4, '2': 5 },
							},
						],
					],
					'Read From File no Header Row': [
						[
							{
								json: {
									row: ['A', 'B', 'C'],
								},
							},
							{
								json: {
									row: [1, 2, 3],
								},
							},
							{
								json: {
									row: [4, 5, 6],
								},
							},
						],
					],
					'Read From File Raw Data': [
						[
							{
								json: { A: '1', B: '2', C: '3' },
							},
							{
								json: { A: '4', B: '5', C: '6' },
							},
						],
					],
					'Read From File Read as String': [
						[
							{
								json: { A: 1, B: 2, C: 3 },
							},
							{
								json: { A: 4, B: 5, C: 6 },
							},
						],
					],
					'Write To File CSV': [
						[
							{
								json: {},
								binary: {
									data: {
										mimeType: 'text/csv',
										fileType: 'text',
										fileExtension: 'csv',
										data: '77u/QSxCLEMKMSwyLDMKNCw1LDYK',
										fileName: 'spreadsheet.csv',
										fileSize: '21 B',
									},
								},
							},
						],
					],
					'Write To File HTML': [
						[
							{
								json: {},
								binary: {
									data: {
										mimeType: 'text/html',
										fileType: 'text',
										fileExtension: 'html',
										data: 'PGh0bWw+PGhlYWQ+PG1ldGEgY2hhcnNldD0idXRmLTgiLz48dGl0bGU+U2hlZXRKUyBUYWJsZSBFeHBvcnQ8L3RpdGxlPjwvaGVhZD48Ym9keT48dGFibGU+PHRyPjx0ZCBkYXRhLXQ9InMiIGRhdGEtdj0iQSIgaWQ9InNqcy1BMSI+QTwvdGQ+PHRkIGRhdGEtdD0icyIgZGF0YS12PSJCIiBpZD0ic2pzLUIxIj5CPC90ZD48dGQgZGF0YS10PSJzIiBkYXRhLXY9IkMiIGlkPSJzanMtQzEiPkM8L3RkPjwvdHI+PHRyPjx0ZCBkYXRhLXQ9Im4iIGRhdGEtdj0iMSIgaWQ9InNqcy1BMiI+MTwvdGQ+PHRkIGRhdGEtdD0ibiIgZGF0YS12PSIyIiBpZD0ic2pzLUIyIj4yPC90ZD48dGQgZGF0YS10PSJuIiBkYXRhLXY9IjMiIGlkPSJzanMtQzIiPjM8L3RkPjwvdHI+PHRyPjx0ZCBkYXRhLXQ9Im4iIGRhdGEtdj0iNCIgaWQ9InNqcy1BMyI+NDwvdGQ+PHRkIGRhdGEtdD0ibiIgZGF0YS12PSI1IiBpZD0ic2pzLUIzIj41PC90ZD48dGQgZGF0YS10PSJuIiBkYXRhLXY9IjYiIGlkPSJzanMtQzMiPjY8L3RkPjwvdHI+PC90YWJsZT48L2JvZHk+PC9odG1sPg==',
										fileName: 'spreadsheet.html',
										fileSize: '535 B',
									},
								},
							},
						],
					],
					// ODS file has slight differences every time it's created
					//
					'Write To File RTF': [
						[
							{
								json: {},
								binary: {
									data: {
										mimeType: 'application/rtf',
										fileExtension: 'rtf',
										data: 'e1xydGYxXGFuc2lcdHJvd2RcdHJhdXRvZml0MVxjZWxseDFcY2VsbHgyXGNlbGx4M1xwYXJkXGludGJsIEFcY2VsbCBCXGNlbGwgQ1xjZWxsXHBhcmRcaW50Ymxccm93XHRyb3dkXHRyYXV0b2ZpdDFcY2VsbHgxXGNlbGx4MlxjZWxseDNccGFyZFxpbnRibCAxXGNlbGwgMlxjZWxsIDNcY2VsbFxwYXJkXGludGJsXHJvd1x0cm93ZFx0cmF1dG9maXQxXGNlbGx4MVxjZWxseDJcY2VsbHgzXHBhcmRcaW50YmwgNFxjZWxsIDVcY2VsbCA2XGNlbGxccGFyZFxpbnRibFxyb3d9',
										fileName: 'spreadsheet.rtf',
										fileSize: '267 B',
									},
								},
							},
						],
					],
					'Write To File XLS': [
						[
							{
								json: {},
								binary: {
									data: {
										mimeType: 'application/vnd.ms-excel',
										fileExtension: 'xls',
										data: '0M8R4KGxGuEAAAAAAAAAAAAAAAAAAAAAPgADAP7/CQAGAAAAAAAAAAAAAAABAAAAAgAAAAAAAAAAEAAAAQAAAAEAAAD+////AAAAAAAAAAD////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////9/////v////7///8EAAAABQAAAP7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7///8CAAAAAwAAAAQAAAAFAAAABgAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAAAARAAAAEgAAABMAAAD+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+/////v////7////+////UgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABQH//////////wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAUAAAAAAAABAFMAaAAzADMAdABKADUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgACAf////8CAAAA/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAFcAbwByAGsA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',
										fileName: 'spreadsheet.xls',
										fileSize: '3.58 kB',
									},
								},
							},
						],
					],
				},
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

	for (const testData of tests) {
		// eslint-disable-next-line @typescript-eslint/no-loop-func
		test(testData.description, async () => {
			// execute workflow
			const { result } = await executeWorkflow(testData, nodeTypes);

			// check if result node data matches expected test data
			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);

			expect(result.finished).toEqual(true);
		});
	}
});
