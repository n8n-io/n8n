import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	JsonObject,
	NodeOperationError,
} from 'n8n-workflow';
export namespace SendInBlueNode {
	export interface EmailAttachment {
		content?: string;
		name?: string;
		url?: string;
	}

	export enum OVERRIDE_MAP_TYPE {
		'CATEGORY' = 'category',
		'NORMAL' = 'normal',
		'TRANSACTIONAL' = 'transactional',
	}

	enum OVERRIDE_MAP_VALUES {
		'CATEGORY' = 'category',
		'NORMAL' = 'boolean',
		'TRANSACTIONAL' = 'id',
	}

	export const INTERCEPTORS = new Map<string, (body: JsonObject) => void>([
		[
			OVERRIDE_MAP_TYPE.CATEGORY,
			(body: JsonObject) => {
				body!.type = OVERRIDE_MAP_VALUES.CATEGORY;
			},
		],
		[
			OVERRIDE_MAP_TYPE.NORMAL,
			(body: JsonObject) => {
				body!.type = OVERRIDE_MAP_VALUES.NORMAL;
			},
		],
		[
			OVERRIDE_MAP_TYPE.TRANSACTIONAL,
			(body: JsonObject) => {
				body!.type = OVERRIDE_MAP_VALUES.TRANSACTIONAL;
			},
		],
	]);

	function getFileName(
		itemIndex: number,
		mimeType: string,
		fileExt: string,
		fileName: string,
	): string {
		let ext = fileExt;
		if (fileExt === undefined) {
			ext = mimeType.split('/')[1];
		}

		let name = `${fileName}.${ext}`;
		if (fileName === undefined) {
			name = `file-${itemIndex}.${ext}`;
		}
		return name;
	}

	export async function validateAttachmentsData(
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const dataPropertyList = this.getNodeParameter(
			'additionalFields.emailAttachments.attachment',
		) as JsonObject[];
		const { body } = requestOptions;

		const { attachment = [] } = body as { attachment: Array<{ content: string; name: string }> };

		try {
			for (const [, attachmentDataName] of dataPropertyList.entries()) {
				const { binaryPropertyName } = attachmentDataName;

				const item = this.getInputData();

				if (item.binary![binaryPropertyName as string] === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						`No binary data property “${binaryPropertyName}” exists on item!`,
					);
				}

				const bufferFromIncomingData = (await this.helpers.getBinaryDataBuffer(
					binaryPropertyName,
				)) as Buffer;

				const {
					data: content,
					mimeType,
					fileName,
					fileExtension,
				} = await this.helpers.prepareBinaryData(bufferFromIncomingData);

				const itemIndex = this.getItemIndex();
				const name = getFileName(
					itemIndex,
					mimeType,
					fileExtension,
					fileName || item.binary!.data.fileName,
				);

				attachment.push({ content, name });
			}

			Object.assign(body as {}, { attachment });

			return requestOptions;
		} catch (err) {
			throw new NodeOperationError(this.getNode(), `${err}`);
		}
	}
}
