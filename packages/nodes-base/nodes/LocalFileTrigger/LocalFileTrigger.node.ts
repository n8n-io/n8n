import type {
	ITriggerFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

import { watch } from 'chokidar';

export class LocalFileTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Local File Trigger',
		name: 'localFileTrigger',
		icon: 'fa:folder-open',
		iconColor: 'black',
		group: ['trigger'],
		version: 1,
		subtitle: '=Path: {{$parameter["path"]}}',
		description: 'Triggers a workflow on file system changes',
		eventTriggerDescription: '',
		defaults: {
			name: 'Local File Trigger',
			color: '#404040',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"<b>While building your workflow</b>, click the 'listen' button, then make a change to your watched file or folder. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, <a data-key='activate'>activate</a> it. Then every time a change is detected, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
				active:
					"<b>While building your workflow</b>, click the 'listen' button, then make a change to your watched file or folder. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time a change is detected, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			},
			activationHint:
				"Once you’ve finished building your workflow, <a data-key='activate'>activate</a> it to have it also listen continuously (you just won’t see those executions here).",
		},
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				options: [
					{
						name: 'Changes to a Specific File',
						value: 'file',
					},
					{
						name: 'Changes Involving a Specific Folder',
						value: 'folder',
					},
				],
				required: true,
				default: '',
			},
			{
				displayName: 'File to Watch',
				name: 'path',
				type: 'string',
				displayOptions: {
					show: {
						triggerOn: ['file'],
					},
				},
				default: '',
				placeholder: '/data/invoices/1.pdf',
			},
			{
				displayName: 'Folder to Watch',
				name: 'path',
				type: 'string',
				displayOptions: {
					show: {
						triggerOn: ['folder'],
					},
				},
				default: '',
				placeholder: '/data/invoices',
			},
			{
				displayName: 'Watch for',
				name: 'events',
				type: 'multiOptions',
				displayOptions: {
					show: {
						triggerOn: ['folder'],
					},
				},
				options: [
					{
						name: 'File Added',
						value: 'add',
						description: 'Triggers whenever a new file was added',
					},
					{
						name: 'File Changed',
						value: 'change',
						description: 'Triggers whenever a file was changed',
					},
					{
						name: 'File Deleted',
						value: 'unlink',
						description: 'Triggers whenever a file was deleted',
					},
					{
						name: 'Folder Added',
						value: 'addDir',
						description: 'Triggers whenever a new folder was added',
					},
					{
						name: 'Folder Deleted',
						value: 'unlinkDir',
						description: 'Triggers whenever a folder was deleted',
					},
				],
				required: true,
				default: [],
				description: 'The events to listen to',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Await Write Finish',
						name: 'awaitWriteFinish',
						type: 'boolean',
						default: false,
						description: 'Whether to wait until files finished writing to avoid partially read',
					},
					{
						displayName: 'Include Linked Files/Folders',
						name: 'followSymlinks',
						type: 'boolean',
						default: true,
						description:
							'Whether linked files/folders will also be watched (this includes symlinks, aliases on MacOS and shortcuts on Windows). Otherwise only the links themselves will be monitored).',
					},
					{
						displayName: 'Ignore',
						name: 'ignored',
						type: 'string',
						default: '',
						placeholder: '**/*.txt',
						description:
							'Files or paths to ignore. The whole path is tested, not just the filename. Supports <a href="https://github.com/micromatch/anymatch">Anymatch</a>- syntax.',
					},
					{
						displayName: 'Ignore Existing Files/Folders',
						name: 'ignoreInitial',
						type: 'boolean',
						default: true,
						description: 'Whether to ignore existing files/folders to not trigger an event',
					},
					{
						displayName: 'Max Folder Depth',
						name: 'depth',
						type: 'options',
						options: [
							{
								name: '1 Levels Down',
								value: 1,
							},
							{
								name: '2 Levels Down',
								value: 2,
							},
							{
								name: '3 Levels Down',
								value: 3,
							},
							{
								name: '4 Levels Down',
								value: 4,
							},
							{
								name: '5 Levels Down',
								value: 5,
							},
							{
								name: 'Top Folder Only',
								value: 0,
							},
							{
								name: 'Unlimited',
								value: -1,
							},
						],
						default: -1,
						description: 'How deep into the folder structure to watch for changes',
					},
					{
						displayName: 'Use Polling',
						name: 'usePolling',
						type: 'boolean',
						default: false,
						description:
							'Whether to use polling for watching. Typically necessary to successfully watch files over a network.',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const triggerOn = this.getNodeParameter('triggerOn') as string;
		const path = this.getNodeParameter('path') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		let events: string[];
		if (triggerOn === 'file') {
			events = ['change'];
		} else {
			events = this.getNodeParameter('events', []) as string[];
		}

		const watcher = watch(path, {
			ignored: options.ignored === '' ? undefined : options.ignored,
			persistent: true,
			ignoreInitial:
				options.ignoreInitial === undefined ? true : (options.ignoreInitial as boolean),
			followSymlinks:
				options.followSymlinks === undefined ? true : (options.followSymlinks as boolean),
			depth: [-1, undefined].includes(options.depth as number)
				? undefined
				: (options.depth as number),
			usePolling: options.usePolling as boolean,
			awaitWriteFinish: options.awaitWriteFinish as boolean,
		});

		const executeTrigger = (event: string, pathString: string) => {
			this.emit([this.helpers.returnJsonArray([{ event, path: pathString }])]);
		};

		for (const eventName of events) {
			watcher.on(eventName, (pathString) => executeTrigger(eventName, pathString as string));
		}

		async function closeFunction() {
			return await watcher.close();
		}

		return {
			closeFunction,
		};
	}
}
