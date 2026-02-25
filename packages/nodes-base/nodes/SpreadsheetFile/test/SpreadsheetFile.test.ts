import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { readFileSync } from 'fs';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'path';

describe('Execute Spreadsheet File Node', () => {
	const testHarness = new NodeTestHarness();
	const readBinaryFile = (fileName: string) =>
		readFileSync(path.resolve(__dirname, fileName), 'base64');

	const loadWorkflow = (fileName: string, csvName: string) => {
		const workflowData = testHarness.readWorkflowJSON(fileName);
		const node = workflowData.nodes.find((n) => n.name === 'Read Binary File')!;
		node.parameters.fileSelector = path.join(__dirname, csvName);
		return workflowData;
	};

	const tests: WorkflowTestData[] = [
		{
			description: 'execute workflow.json',
			input: {
				workflowData: loadWorkflow('workflow.json', 'spreadsheet.csv'),
			},
			output: {
				assertBinaryData: true,
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
					'Read CSV with Row Limit': [[{ json: { A: '1', B: '2', C: '3' } }]],
					'Write To File CSV': [
						[
							{
								json: {},
								binary: {
									data: {
										mimeType: 'text/csv',
										fileType: 'text',
										fileExtension: 'csv',
										data: '77u/QSxCLEMKMSwyLDMKNCw1LDY=',
										fileName: 'spreadsheet.csv',
										fileSize: '20 B',
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
										fileType: 'html',
										fileExtension: 'html',
										data: readBinaryFile('spreadsheet.html'),
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
										data: readBinaryFile('spreadsheet.rtf'),
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
										data: readBinaryFile('spreadsheet.xls'),
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
		{
			description: 'execute workflow.bom.json',
			input: {
				workflowData: loadWorkflow('workflow.bom.json', 'bom.csv'),
			},
			output: {
				nodeData: {
					'Edit with BOM included': [[{ json: { X: null } }]],
					'Edit with BOM excluded': [[{ json: { X: '1' } }]],
				},
			},
		},
		{
			description: 'execute includeempty.json',
			input: {
				workflowData: loadWorkflow('workflow.empty.json', 'includeempty.csv'),
			},
			output: {
				nodeData: {
					'Include Empty': [[{ json: { A: '1', B: '', C: '3' } }]],
					'Ignore Empty': [[{ json: { A: '1', C: '3' } }]],
				},
			},
		},
		{
			description: 'execute utf8.json',
			input: {
				workflowData: loadWorkflow('workflow.utf8.json', 'utf8.csv'),
			},
			output: {
				nodeData: {
					'Parse UTF8 v1': [
						[{ json: { A: 1, B: '株式会社', C: 3 } }, { json: { A: 4, B: 5, C: '🐛' } }],
					],
					'Parse UTF8 v2': [
						[{ json: { A: '1', B: '株式会社', C: '3' } }, { json: { A: '4', B: '5', C: '🐛' } }],
					],
				},
			},
		},
	];

	for (const testData of tests) {
		testHarness.setupTest(testData);
	}
});
