import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-952310-createsubmittosandboxanalyzertask.html" target="_blank" rel="noopener noreferrer">Create Submit to Sandbox Analyzer Task</a>',
		name: 'createSubmitToSandboxAnalyzerTaskDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Target ID',
		name: 'targetId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The endpoint ID from which the task will be launched and where the files are located. Compatible only with Windows endpoints.',
	},
	{
		displayName: 'Sample Paths',
		name: 'samplePaths',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of file paths to submit for analysis (e.g. "C:\\file1.exe, C:\\file2.dll")',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Command Lines',
				name: 'commandLines',
				type: 'string',
				default: '',
				description:
					'A comma-separated list of command lines to customize how each file is processed in Sandbox Analyzer (e.g. "C:\\file1.exe -arg1 -arg2, C:\\file2.dll -arg3 -arg4")',
			},
			{
				displayName: 'Task Name',
				name: 'taskName',
				type: 'string',
				default: '',
				description: 'The name of the task. Auto-generated if not provided.',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['createSubmitToSandboxAnalyzerTask'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const targetId = this.getNodeParameter('targetId', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const samplePathsRaw = this.getNodeParameter('samplePaths', i) as string;
	const samplePaths = samplePathsRaw
		.split(',')
		.map((p) => p.trim())
		.filter(Boolean);

	const params: IDataObject = { targetId, samplePaths };

	if (options.commandLines !== undefined && (options.commandLines as string) !== '') {
		const commandLinesRaw = options.commandLines as string;
		params.commandLines = commandLinesRaw
			.split(',')
			.map((c) => c.trim())
			.filter(Boolean);
	}
	if (options.taskName !== undefined && (options.taskName as string) !== '')
		params.taskName = options.taskName;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'createSubmitToSandboxAnalyzerTask',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
