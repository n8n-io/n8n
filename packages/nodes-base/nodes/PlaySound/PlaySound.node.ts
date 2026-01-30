import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class PlaySound implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Play Sound',
		name: 'playSound',
		icon: 'fa:megaphone',
		group: ['organization'],
		version: 1,
		subtitle: '={{$parameter["sound"] === "custom" ? "Custom sound" : $parameter["sound"]}}',
		description: 'Play a sound in your connected n8n browser sessions',
		defaults: {
			name: 'Play Sound',
			color: '#7c3aed',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'Plays a sound in your connected n8n browser sessions.<br><br>' +
					'<strong>Sound options:</strong><br>' +
					'• <em>Success</em> - Ascending pleasant tone<br>' +
					'• <em>Error</em> - Low descending tone<br>' +
					'• <em>Warning</em> - Attention-getting beep<br>' +
					'• <em>Info</em> - Short ping<br>' +
					'• <em>Custom</em> - Play sound from a URL<br><br>' +
					'<em>Note: Sounds are played in all your open n8n tabs, not to other users.</em>',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Sound',
				name: 'sound',
				type: 'options',
				options: [
					{
						name: 'Custom',
						value: 'custom',
						description: 'Play a custom sound from a URL',
					},
					{
						name: 'Error',
						value: 'error',
						description: 'Low descending tone for errors or failures',
					},
					{
						name: 'Info',
						value: 'info',
						description: 'Short ping for informational alerts',
					},
					{
						name: 'Success',
						value: 'success',
						description: 'Pleasant ascending tone for successful operations',
					},
					{
						name: 'Warning',
						value: 'warning',
						description: 'Attention-getting beep for warnings',
					},
				],
				default: 'success',
				description: 'The type of sound to play',
			},
			{
				displayName: 'Sound URL',
				name: 'soundUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						sound: ['custom'],
					},
				},
				description: 'URL to the sound file (MP3, WAV, OGG)',
				placeholder: 'e.g. https://example.com/sound.mp3',
			},
			{
				displayName: 'Volume',
				name: 'volume',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
					numberStepSize: 10,
				},
				default: 100,
				description: 'Volume level (0-100%)',
			},
		],
		hints: [
			{
				type: 'info',
				message:
					'Sound will be played in your browser when this node executes. ' +
					'Make sure your browser tab is open and not muted.',
				displayCondition: '=true',
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		type SoundType = 'success' | 'error' | 'warning' | 'info' | 'custom';
		const sound = this.getNodeParameter('sound', 0) as SoundType;
		const volume = this.getNodeParameter('volume', 0) as number;

		const soundUrl =
			sound === 'custom' ? (this.getNodeParameter('soundUrl', 0) as string) : undefined;

		this.setMetadata({
			browserApi: {
				type: 'playSound',
				playSound: {
					sound,
					url: soundUrl,
					volume: volume / 100,
				},
			},
		});

		return [
			items.map((item) => ({
				...item,
				json: {
					...item.json,
					playSound: {
						sound,
						soundUrl: soundUrl ?? null,
						volume,
						status: 'sent',
						note: 'Sound was sent to your browser. If you did not hear it, check that your browser tab is not muted.',
					},
				},
			})),
		];
	}
}
