import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import gm from 'gm';

export class InmoSuperApp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Inmo Super App',
		name: 'inmoSuperApp',
		icon: 'file:inmoSuperAppIcon.svg',
		group: ['transform'],
		version: 1,
		description:
			'Process different types of media - resize images, adjust text font size, adjust audio/video volume. The boolean options (Show Text, Show Image, Volume Control) are automatically enabled based on detected content types in the input data, overriding manual settings.',
		defaults: {
			name: 'Inmo Super App',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			// Image Options
			{
				displayName: 'Show Image',
				name: 'showImage',
				type: 'boolean',
				default: true,
				description:
					'This option is automatically set to true when image content is detected in the input data. Manual setting is overridden during execution.',
			},
			{
				displayName: 'Image Position X',
				name: 'imagePosX',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						showImage: [true],
					},
				},
			},
			{
				displayName: 'Image Position Y',
				name: 'imagePosY',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						showImage: [true],
					},
				},
			},
			{
				displayName: 'Image Width',
				name: 'imageResizeWidth',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						showImage: [true],
					},
				},
			},
			{
				displayName: 'Image Height',
				name: 'imageResizeHeight',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						showImage: [true],
					},
				},
			},
			// Audio/Video Options
			{
				displayName: 'Volume Control',
				name: 'enableVolumeControl',
				type: 'boolean',
				default: true,
				description:
					'This option is automatically set to true when audio or video content is detected in the input data. Manual setting is overridden during execution.',
			},
			{
				displayName: 'Volume',
				name: 'volume',
				type: 'slider',
				default: 50,
				required: true,
				displayOptions: {
					show: {
						enableVolumeControl: [true],
					},
				},
				typeOptions: {
					minValue: 0,
					maxValue: 100,
					showInput: true,
					showInputControls: true,
					showTooltip: true,
				},
				description: 'Volume Control (0-100)',
			},
			// Text Options
			{
				displayName: 'Show Text',
				name: 'showText',
				type: 'boolean',
				default: true,
				description:
					'This option is automatically set to true when text content is detected in the input data. Manual setting is overridden during execution.',
			},
			{
				displayName: 'X',
				name: 'textX',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						showText: [true],
					},
				},
			},
			{
				displayName: 'Y',
				name: 'textY',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						showText: [true],
					},
				},
			},
			{
				displayName: 'Width',
				name: 'textWidth',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						showText: [true],
					},
				},
			},
			{
				displayName: 'Height',
				name: 'textHeight',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						showText: [true],
					},
				},
			},
			{
				displayName: 'Font Size',
				name: 'fontSize',
				type: 'options',
				options: [
					{
						name: 'Small (12px)',
						value: 12,
					},
					{
						name: 'Medium (16px)',
						value: 16,
					},
					{
						name: 'Large (20px)',
						value: 20,
					},
					{
						name: 'Extra Large (24px)',
						value: 24,
					},
					{
						name: 'Huge (32px)',
						value: 32,
					},
				],
				default: 16,
				displayOptions: {
					show: {
						showText: [true],
					},
				},
			},
			{
				displayName: 'Font Family',
				name: 'fontFamily',
				type: 'options',
				options: [
					{
						name: 'Arial',
						value: 'Arial',
					},
					{
						name: 'Times New Roman',
						value: 'Times New Roman',
					},
					{
						name: 'Courier New',
						value: 'Courier New',
					},
					{
						name: 'Georgia',
						value: 'Georgia',
					},
					{
						name: 'Verdana',
						value: 'Verdana',
					},
					{
						name: 'Helvetica',
						value: 'Helvetica',
					},
				],
				default: 'Arial',
				displayOptions: {
					show: {
						showText: [true],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const item = items[itemIndex];
				const result: INodeExecutionData = {
					json: { ...item.json },
					binary: { ...item.binary },
					pairedItem: { item: itemIndex },
				};

				let processed = false;

				// Dynamically determine what content types are available
				const hasTextContent = await hasText(item);
				const hasImageContent = await hasImage(item);
				const hasVideoContent = await hasVideo(item);
				const hasAudioContent = await hasAudio(item);

				// Set boolean flags based on actual content availability - these override the node parameters
				const showText = hasTextContent;
				const showImage = hasImageContent;
				const enableVolumeControl = hasVideoContent || hasAudioContent;

				// Add content detection results to output for transparency
				result.json = {
					...result.json,
					contentDetection: {
						hasText: hasTextContent,
						hasImage: hasImageContent,
						hasVideo: hasVideoContent,
						hasAudio: hasAudioContent,
					},
					dynamicSettings: {
						showText,
						showImage,
						enableVolumeControl,
					},
				};

				if (hasTextContent) {
					try {
						const textResult = await processText(this, item, itemIndex, showText);
						result.json = { ...result.json, ...textResult.json };
						processed = true;
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							`Text processing failed: ${(error as Error).message}`,
							{ itemIndex },
						);
					}
				}

				if (hasImageContent) {
					try {
						const imageResult = await processImage(this, item, itemIndex, showImage);
						result.json = { ...result.json, ...imageResult.json };
						result.binary = { ...result.binary, ...imageResult.binary };
						processed = true;
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							`Image processing failed: ${(error as Error).message}`,
							{ itemIndex },
						);
					}
				}

				if (hasVideoContent) {
					try {
						const videoResult = await processVideo(this, item, itemIndex, enableVolumeControl);
						result.json = { ...result.json, ...videoResult.json };
						result.binary = { ...result.binary, ...videoResult.binary };
						processed = true;
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							`Video processing failed: ${(error as Error).message}`,
							{ itemIndex },
						);
					}
				}

				if (hasAudioContent) {
					try {
						const audioResult = await processAudio(this, item, itemIndex, enableVolumeControl);
						result.json = { ...result.json, ...audioResult.json };
						result.binary = { ...result.binary, ...audioResult.binary };
						processed = true;
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							`Audio processing failed: ${(error as Error).message}`,
							{ itemIndex },
						);
					}
				}

				if (!processed) {
					result.json = {
						...result.json,
						message: 'No supported media or text content found in this item',
						availableKeys: item.binary ? Object.keys(item.binary) : [],
					};
				}

				// Always include the final boolean states in the main result
				result.json = {
					...result.json,
					showText,
					showImage,
					enableVolumeControl,
				};

				returnData.push(result);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
							itemIndex,
							showText: false,
							showImage: false,
							enableVolumeControl: false,
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

async function hasText(item: INodeExecutionData): Promise<boolean> {
	const textFields = ['chatInput', 'text', 'content', 'message', 'body', 'description'];
	const jsonData = item.json as string | IDataObject;

	if (typeof jsonData === 'string' && jsonData.trim() !== '') {
		return true;
	}

	if (typeof jsonData === 'object' && jsonData !== null) {
		for (const field of textFields) {
			const value = jsonData[field];
			if (typeof value === 'string' && value.trim() !== '') {
				return true;
			}
		}
	}
	return false;
}

async function hasImage(item: INodeExecutionData): Promise<boolean> {
	if (item.json?.files && Array.isArray(item.json.files)) {
		const file = item.json.files[0];
		if (file.fileType === 'image' || file.mimeType?.startsWith('image/')) {
			if (item.binary?.['files_0']) {
				return true;
			}
		}
	}

	if (item.binary) {
		for (const key in item.binary) {
			if (item.binary[key].mimeType.startsWith('image/')) {
				return true;
			}
		}
	}
	return false;
}

async function hasVideo(item: INodeExecutionData): Promise<boolean> {
	if (item.json?.files && Array.isArray(item.json.files)) {
		const file = item.json.files[0];
		if (file.fileType === 'video' || file.mimeType?.startsWith('video/')) {
			if (item.binary?.['files_0']) {
				return true;
			}
		}
	}

	if (item.binary) {
		for (const key in item.binary) {
			if (item.binary[key].mimeType.startsWith('video/')) {
				return true;
			}
		}
	}
	return false;
}

async function hasAudio(item: INodeExecutionData): Promise<boolean> {
	if (item.json?.files && Array.isArray(item.json.files)) {
		const file = item.json.files[0];
		if (file.fileType === 'audio' || file.mimeType?.startsWith('audio/')) {
			if (item.binary?.['files_0']) {
				return true;
			}
		}
	}

	if (item.binary) {
		for (const key in item.binary) {
			if (item.binary[key].mimeType.startsWith('audio/')) {
				return true;
			}
		}
	}
	return false;
}

async function processImage(
	context: IExecuteFunctions,
	item: INodeExecutionData,
	itemIndex: number,
	showImage: boolean,
): Promise<INodeExecutionData> {
	const binaryInfo = getBinaryDataInfo(item, 'data', 'image');
	if (!binaryInfo) {
		throw new NodeOperationError(
			context.getNode(),
			`No image binary data found in property "data" or files`,
			{ itemIndex },
		);
	}

	const { binaryData, propertyName } = binaryInfo;

	try {
		// Get binary buffer
		const buffer = await getBinaryBuffer(context, binaryData, itemIndex, propertyName);

		// Initialize gm instance with the image buffer
		let gmInstance = gm(buffer);
		gmInstance = gmInstance.background('transparent');

		if (showImage) {
			const width = context.getNodeParameter('imageResizeWidth', itemIndex) as number;
			const height = context.getNodeParameter('imageResizeHeight', itemIndex) as number;

			// Use gm resize with ignoreAspectRatio option (!) to maintain exact dimensions
			gmInstance = gmInstance.resize(width, height, '!');
		}

		// Convert the processed image to buffer using gm's toBuffer method
		const processedBuffer = await new Promise<Buffer>((resolve, reject) => {
			gmInstance.toBuffer((error: Error | null, buffer: Buffer) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(buffer);
			});
		});

		const newBinaryData = await context.helpers.prepareBinaryData(
			processedBuffer,
			binaryData.fileName,
			binaryData.mimeType,
		);

		return {
			json: {
				...item.json,
				showImage,
				originalSize: buffer.length,
				processedSize: processedBuffer.length,
				...(showImage && {
					imagePosition: {
						imageX: context.getNodeParameter('imagePosX', itemIndex) as number,
						imageY: context.getNodeParameter('imagePosY', itemIndex) as number,
					},
					imageSize: {
						width: context.getNodeParameter('imageResizeWidth', itemIndex) as number,
						height: context.getNodeParameter('imageResizeHeight', itemIndex) as number,
					},
				}),
			},
			binary: {
				data: newBinaryData,
			},
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			`Image processing failed: ${(error as Error).message}`,
			{ itemIndex },
		);
	}
}

async function processVideo(
	context: IExecuteFunctions,
	item: INodeExecutionData,
	itemIndex: number,
	enableVolumeControl: boolean,
): Promise<INodeExecutionData> {
	const binaryInfo = getBinaryDataInfo(item, 'data', 'video');
	if (!binaryInfo) {
		throw new NodeOperationError(
			context.getNode(),
			`No video binary data found in property "data" or files`,
			{ itemIndex },
		);
	}

	const { binaryData, propertyName } = binaryInfo;

	const buffer = await getBinaryBuffer(context, binaryData, itemIndex, propertyName);

	return {
		json: {
			...item.json,
			enableVolumeControl,
			binarySize: buffer.length,
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
			...(enableVolumeControl && {
				volume: context.getNodeParameter('volume', itemIndex) as number,
			}),
		},
		binary: item.binary,
		pairedItem: { item: itemIndex },
	};
}

async function processAudio(
	context: IExecuteFunctions,
	item: INodeExecutionData,
	itemIndex: number,
	enableVolumeControl: boolean,
): Promise<INodeExecutionData> {
	const binaryInfo = getBinaryDataInfo(item, 'data', 'audio');
	if (!binaryInfo) {
		throw new NodeOperationError(
			context.getNode(),
			`No audio binary data found in property "data" or files`,
			{ itemIndex },
		);
	}

	const { binaryData, propertyName } = binaryInfo;

	const buffer = await getBinaryBuffer(context, binaryData, itemIndex, propertyName);

	return {
		json: {
			...item.json,
			enableVolumeControl,
			binarySize: buffer.length,
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
			...(enableVolumeControl && {
				volume: context.getNodeParameter('volume', itemIndex) as number,
			}),
		},
		binary: item.binary,
		pairedItem: { item: itemIndex },
	};
}

async function processText(
	context: IExecuteFunctions,
	item: INodeExecutionData,
	itemIndex: number,
	showText: boolean,
): Promise<INodeExecutionData> {
	let text = '';
	const textFields = ['chatInput', 'text', 'content', 'message', 'body', 'description'];

	if (typeof item.json === 'string') {
		text = item.json;
	} else if (typeof item.json === 'object' && item.json !== null) {
		for (const field of textFields) {
			if (typeof item.json[field] === 'string' && item.json[field].trim() !== '') {
				text = item.json[field] as string;
				break;
			}
		}

		if (!text) {
			try {
				text = JSON.stringify(item.json, null, 2);
			} catch (e) {}
		}
	}

	if (!text) {
		throw new NodeOperationError(
			context.getNode(),
			'No text found in item. Please make sure the input contains text data.',
			{ itemIndex },
		);
	}

	return {
		json: {
			...item.json,
			showText,
			text,
			...(showText && {
				position: {
					x: context.getNodeParameter('textX', itemIndex) as number,
					y: context.getNodeParameter('textY', itemIndex) as number,
				},
				size: {
					width: context.getNodeParameter('textWidth', itemIndex) as number,
					height: context.getNodeParameter('textHeight', itemIndex) as number,
				},
				style: {
					fontSize: context.getNodeParameter('fontSize', itemIndex) as number,
					fontFamily: context.getNodeParameter('fontFamily', itemIndex) as string,
				},
			}),
		},
		pairedItem: { item: itemIndex },
	};
}

async function getBinaryBuffer(
	context: IExecuteFunctions,
	binaryData: any,
	itemIndex: number,
	propertyName: string,
): Promise<Buffer> {
	if (binaryData.id) {
		const binaryStream = await context.helpers.getBinaryStream(binaryData.id);
		return await context.helpers.binaryToBuffer(binaryStream);
	} else {
		return await context.helpers.getBinaryDataBuffer(itemIndex, propertyName);
	}
}

function getBinaryDataInfo(
	item: INodeExecutionData,
	binaryPropertyName: string,
	mediaType: 'image' | 'video' | 'audio',
): { binaryData: any; propertyName: string } | null {
	if (item.json?.files && Array.isArray(item.json.files)) {
		const file = item.json.files[0];
		const isMatchingType =
			file.fileType === mediaType || file.mimeType?.startsWith(`${mediaType}/`);

		if (isMatchingType && item.binary?.['files_0']) {
			return {
				binaryData: item.binary['files_0'],
				propertyName: 'files_0',
			};
		}
	}

	if (item.binary?.[binaryPropertyName]) {
		const binaryData = item.binary[binaryPropertyName];
		if (binaryData.mimeType.startsWith(`${mediaType}/`)) {
			return {
				binaryData,
				propertyName: binaryPropertyName,
			};
		}
	}

	if (item.binary) {
		for (const key in item.binary) {
			if (item.binary[key].mimeType.startsWith(`${mediaType}/`)) {
				return {
					binaryData: item.binary[key],
					propertyName: key,
				};
			}
		}
	}

	return null;
}
