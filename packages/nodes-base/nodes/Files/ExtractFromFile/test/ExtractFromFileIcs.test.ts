import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { expect } from 'vitest';

const harness = new NodeTestHarness();

const icsContent = [
	'BEGIN:VCALENDAR',
	'VERSION:2.0',
	'PRODID:DAVx5/4.4.2-ose ical4j/3.2.19',
	'BEGIN:VEVENT',
	'UID:event-001@example.com',
	'DTSTART:20270601T090000',
	'DTEND:20270601T100000',
	'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=2',
	'SUMMARY:Team Standup',
	'DESCRIPTION:Daily standup meeting',
	'LOCATION:Conference Room A',
	'END:VEVENT',
	'END:VCALENDAR',
].join('\r\n');

const workflows: WorkflowTestData[] = [
	{
		description: 'fromIcs',
		input: {
			workflowData: {
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [250, 300],
						parameters: {},
					},
					{
						id: '2',
						name: 'Edit Fields',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [0, 300],
						parameters: {
							assignments: {
								assignments: [
									{
										id: 'a1',
										name: 'text',
										value: icsContent,
										type: 'string',
									},
								],
							},
							options: {},
						},
					},
					{
						id: '3',
						name: 'Convert to ICS Text',
						type: 'n8n-nodes-base.convertToFile',
						typeVersion: 1.1,
						position: [250, 300],
						parameters: {
							operation: 'toText',
							sourceProperty: 'text',
							binaryPropertyName: 'data',
							options: {},
						},
					},
					{
						id: '4',
						name: 'Extract from File',
						type: 'n8n-nodes-base.extractFromFile',
						typeVersion: 1,
						position: [500, 300],
						parameters: {
							operation: 'fromIcs',
							binaryPropertyName: 'data',
							destinationKey: 'data',
							options: {},
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Edit Fields', type: NodeConnectionTypes.Main, index: 0 }]],
					},
					'Edit Fields': {
						main: [[{ node: 'Convert to ICS Text', type: NodeConnectionTypes.Main, index: 0 }]],
					},
					'Convert to ICS Text': {
						main: [[{ node: 'Extract from File', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			},
		},
		output: {
			nodeData: {
				'Extract from File': [
					[
						{
							json: {
								data: expect.objectContaining({
									prodId: 'DAVx5/4.4.2-ose ical4j/3.2.19',
									version: '2.0',
									events: expect.arrayContaining([
										expect.objectContaining({
											uid: 'event-001@example.com',
											summary: 'Team Standup',
											description: 'Daily standup meeting',
											location: 'Conference Room A',
											start: expect.objectContaining({
												type: 'DATE-TIME',
												date: new Date('2027-06-01T09:00:00.000Z'),
											}),
											end: expect.objectContaining({
												type: 'DATE-TIME',
												date: new Date('2027-06-01T10:00:00.000Z'),
											}),
										}),
									]),
								}),
							},
						},
					],
				],
			},
		},
	},
];

describe('ExtractFromFile ICS', () => {
	for (const testData of workflows) {
		harness.setupTest(testData);
	}
});
