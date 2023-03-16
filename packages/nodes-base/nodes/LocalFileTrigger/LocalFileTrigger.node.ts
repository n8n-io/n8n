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
		group: ['trigger'],
		version: 1,
		subtitle: '=Path: {{$parameter["path"]}}',
		description: 'Triggers a workflow on file system changes',
		eventTriggerDescription: '',
		defaults: {
			name: 'Local File Trigger',
			color: '#404040',
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
					// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
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
			ignoreInitial: true,
			followSymlinks:
				options.followSymlinks === undefined ? true : (options.followSymlinks as boolean),
			depth: [-1, undefined].includes(options.depth as number)
				? undefined
				: (options.depth as number),
		});

		const executeTrigger = (event: string, pathString: string) => {
			this.emit([this.helpers.returnJsonArray([{ event, path: pathString }])]);
		};

		for (const eventName of events) {
			watcher.on(eventName, (pathString) => executeTrigger(eventName, pathString as string));
		}

		async function closeFunction() {
			return watcher.close();
		}

		return {
			closeFunction,
		};
	}
}
