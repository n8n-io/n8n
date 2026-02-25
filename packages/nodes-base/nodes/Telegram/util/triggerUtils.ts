import {
	type ICredentialDataDecryptedObject,
	type IDataObject,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { apiRequest, getImageBySize } from '../GenericFunctions';
import { type IEvent } from '../IEvent';

export const downloadFile = async (
	webhookFunctions: IWebhookFunctions,
	credentials: ICredentialDataDecryptedObject,
	bodyData: IEvent,
	additionalFields: IDataObject,
): Promise<IWebhookResponseData> => {
	let imageSize = 'large';

	let key: 'message' | 'channel_post' = 'message';

	if (bodyData.channel_post) {
		key = 'channel_post';
	}

	if (
		(bodyData[key]?.photo && Array.isArray(bodyData[key]?.photo)) ||
		bodyData[key]?.document ||
		bodyData[key]?.video
	) {
		if (additionalFields.imageSize) {
			imageSize = additionalFields.imageSize as string;
		}

		let fileId;

		if (bodyData[key]?.photo) {
			let image = getImageBySize(bodyData[key]?.photo as IDataObject[], imageSize) as IDataObject;

			// When the image is sent from the desktop app telegram does not resize the image
			// So return the only image available
			// Basically the Image Size parameter would work just when the images comes from the mobile app
			if (image === undefined) {
				image = bodyData[key]!.photo![0];
			}

			fileId = image.file_id;
		} else if (bodyData[key]?.video) {
			fileId = bodyData[key]?.video?.file_id;
		} else {
			fileId = bodyData[key]?.document?.file_id;
		}

		const {
			result: { file_path },
		} = await apiRequest.call(webhookFunctions, 'GET', `getFile?file_id=${fileId}`, {});

		const file = await apiRequest.call(
			webhookFunctions,
			'GET',
			'',
			{},
			{},
			{
				json: false,
				encoding: null,
				uri: `${credentials.baseUrl}/file/bot${credentials.accessToken}/${file_path}`,
				resolveWithFullResponse: true,
			},
		);

		const data = Buffer.from(file.body as string);

		const fileName = file_path.split('/').pop();

		const binaryData = await webhookFunctions.helpers.prepareBinaryData(
			data as unknown as Buffer,
			fileName as string,
		);

		return {
			workflowData: [
				[
					{
						json: bodyData as unknown as IDataObject,
						binary: {
							data: binaryData,
						},
					},
				],
			],
		};
	}

	return {};
};
