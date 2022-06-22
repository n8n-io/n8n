import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	JsonObject, NodeOperationError,
} from 'n8n-workflow';

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
	[OVERRIDE_MAP_TYPE.CATEGORY, (body: JsonObject) => {
			body!.type = OVERRIDE_MAP_VALUES.CATEGORY;
	}],
	[OVERRIDE_MAP_TYPE.NORMAL, (body: JsonObject) => {
		body!.type = OVERRIDE_MAP_VALUES.NORMAL;
	}],
	[OVERRIDE_MAP_TYPE.TRANSACTIONAL, (body: JsonObject) => {
		body!.type = OVERRIDE_MAP_VALUES.TRANSACTIONAL;
	}],
]);
const base64EncodingRegExp = new RegExp('^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$');
const fileTypeRegExp = new RegExp('^.*\.(JPG|GIF|DOC|PDF|xlsx|xls|ods|docx|docm|doc|csv|pdf|txt|gif|jpg|jpeg|png|tif|tiff|rtf|bmp|cgm|css|shtml|html|htm|zip|xml|ppt|pptx|tar|ez|ics|mobi|msg|pub|eps|odt|mp3|m4a|m4v|wma|ogg|flac|wav|aif|aifc|aiff|mp4|mov|avi|mkv|mpeg|mpg|wmv|pkpass|xlsm)$');

const validateAttchmentName = (name: string) => {
	return fileTypeRegExp.test(name);
}

const validateBase64Encoding = (data: string) => {
	return base64EncodingRegExp.test(data);
}

const validateURL = (url: string) => {
	try {
    let result = new URL(url);
  } catch (_) {
    return false;
  }

	return true;
}

export async function validateAttachmentsData (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	const attachments = this.getNodeParameter('additionalParameters.emailAttachments.attachment') as JsonObject[];
	const { body } = requestOptions;

	const { attachment } = body as unknown as JsonObject;

	try {
		for(let [index, attachmentData] of attachments.entries()) {
			const { useAttachmentUrl } = attachmentData;
			const { content = '', name = '', url = '' } = (attachment as EmailAttachment[])[index];

			if(useAttachmentUrl) {
				if(!validateURL(url!)) {
					throw new NodeOperationError(
						this.getNode(),
						`Please enter a valid attachment URL`,
					);
				}
			} else {
				// Ensure image has filetype
				if(!validateAttchmentName(name!)) {
					throw new NodeOperationError(
						this.getNode(),
						`Please enter an attachment name with a filetype e.g (attachment.png)`,
					);
				}

				// Ensure base64 data is correctly formatted
				if(!validateBase64Encoding(content!)) {
					throw new NodeOperationError(
						this.getNode(),
						`Please enter valid base64 file data`,
					);
				}
			}
		}
		return requestOptions;
	}
	catch(err) {
		throw new NodeOperationError(
			this.getNode(),
			`${err}`
		)
	}
}
