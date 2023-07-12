/* eslint-disable @typescript-eslint/no-loop-func */
import * as Helpers from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import path from 'path';

describe('Test Read Binary File Node', () => {
	beforeEach(async () => {
		await Helpers.initBinaryDataManager();
	});

	const workflow = Helpers.readJsonFileSync(
		'nodes/ReadBinaryFile/test/ReadBinaryFile.workflow.json',
	);
	const node = workflow.nodes.find((n: any) => n.name === 'Read Binary File');
	node.parameters.filePath = path.join(__dirname, 'image.jpg');

	const tests: WorkflowTestData[] = [
		{
			description: 'nodes/ReadBinaryFile/test/ReadBinaryFile.workflow.json',
			input: {
				workflowData: workflow,
			},
			output: {
				nodeData: {
					'Read Binary File': [
						[
							{
								json: {},
								binary: {
									data: {
										mimeType: 'image/jpeg',
										fileType: 'image',
										fileExtension: 'jpg',
										data: '/9j/4AAQSkZJRgABAQEASABIAAD/4QBmRXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAExAAIAAAAQAAAATgAAAAAAARlJAAAD6AABGUkAAAPocGFpbnQubmV0IDUuMC4xAP/bAEMAIBYYHBgUIBwaHCQiICYwUDQwLCwwYkZKOlB0Znp4cmZwboCQuJyAiK6KbnCg2qKuvsTO0M58muLy4MjwuMrOxv/bAEMBIiQkMCowXjQ0XsaEcITGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxv/AABEIAB8AOwMBEgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AOgqgrXF2zNHJ5aKcD3oNPZ23di/VKG82bkuTh1OMgdaAdOSLtZ6G5ut0iSeWoOAKAdO27NCqUN8oQrcHDqccDrQDpyRNPdRwEKcsx7CobIebPLORwThc0inGMF724jagNpxG4OOM1dIDAgjIPBpkqUOxnR2pmh85pW3nJB9KkNi4yqTssZ6rSNXNX0ehHFfusYDLuI7+tXY4I40ChQcdzQRKcL7Fb7PcQO32cqUY5we1XqZPtH11KsFoFDGYK7sckkZxVqgTnJlEQXMBZYGUoTkZ7VeoH7RvcqwWaIh80K7k5JIq1QJzkyhbMtvdSxMdqnlc1amgjmx5i5I70inNSVpFdrmaWRltkBVerHvUW57B2AUNGxyOaC+VW9xXLVrcGbcjrtkXqKZZxvveeTAL9APSgiooq1ty3RTMj//2Q==',
										directory: __dirname,
										fileName: 'image.jpg',
										fileSize: '1.04 kB',
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
		test(testData.description, async () => {
			const { result } = await executeWorkflow(testData, nodeTypes);

			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);

			expect(result.finished).toEqual(true);
		});
	}
});
