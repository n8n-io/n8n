import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { seaTableApiRequest } from '../../../GenericFunctions';
import type { IUploadLink, IRowObject } from '../../Interfaces';

export async function upload(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const uploadColumn = this.getNodeParameter('uploadColumn', index) as any;
	const uploadColumnType = uploadColumn.split(':::')[1];
	const uploadColumnName = uploadColumn.split(':::')[0];
	const dataPropertyName = this.getNodeParameter('dataPropertyName', index) as string;
	const tableName = this.getNodeParameter('tableName', index) as string;
	const rowId = this.getNodeParameter('rowId', index) as string;
	const uploadLink = (await seaTableApiRequest.call(
		this,
		{},
		'GET',
		'/api/v2.1/dtable/app-upload-link/',
	)) as IUploadLink;
	const relativePath =
		uploadColumnType === 'image' ? uploadLink.img_relative_path : uploadLink.file_relative_path;
	const replace = this.getNodeParameter('replace', index) as string;
	const append = this.getNodeParameter('append', index) as string;

	// get server url
	const credentials = await this.getCredentials('seaTableApi');
	const serverURL = credentials.domain ?? 'https://cloud.seatable.io';

	// get workspaceId
	const workspaceId = (
		await this.helpers.request({
			headers: {
				Authorization: `Token ${credentials.token}`,
			},
			uri: `${serverURL}/api/v2.1/dtable/app-access-token/`,
			json: true,
		})
	).workspace_id;

	// if there are already assets attached to the column
	let existingAssetArray = [];
	if (append) {
		let rowToUpdate = await seaTableApiRequest.call(
			this,
			{},
			'GET',
			'/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/' + rowId,
			{},
			{
				table_name: tableName,
			},
		);
		existingAssetArray = rowToUpdate[uploadColumnName];
	}

	// Get the binary data and prepare asset for upload
	const fileBufferData = await this.helpers.getBinaryDataBuffer(index, dataPropertyName);
	const binaryData = this.helpers.assertBinaryData(index, dataPropertyName);
	const options = {
		formData: {
			file: {
				value: fileBufferData,
				options: {
					filename: binaryData.fileName,
					contentType: binaryData.mimeType,
				},
			},
			parent_dir: uploadLink.parent_path,
			replace: replace ? '1' : '0',
			relative_path: relativePath,
		},
	};

	// Send the upload request
	let uploadAsset = await seaTableApiRequest.call(
		this,
		{},
		'POST',
		`/seafhttp/upload-api/${uploadLink.upload_link.split('seafhttp/upload-api/')[1]}?ret-json=true`,
		{},
		{},
		'',
		options,
	);

	// now step 2 (attaching the asset to a column in a base)
	for (let c = 0; c < uploadAsset.length; c++) {
		const body = {
			table_name: tableName,
			row_id: rowId,
			row: {},
		} as IDataObject;
		let rowInput = {} as IRowObject;

		const filePath = `${serverURL}/workspace/${workspaceId}${uploadLink.parent_path}/${relativePath}/${uploadAsset[c].name}`;

		if (uploadColumnType === 'image') {
			rowInput[uploadColumnName] = [filePath];
		} else if (uploadColumnType === 'file') {
			rowInput[uploadColumnName] = uploadAsset;
			uploadAsset[c].type = 'file';
			uploadAsset[c].url = filePath;
		}

		// merge with existing assets in this column or with [] and remove duplicates
		rowInput[uploadColumnName] = [
			// @ts-ignore:
			...new Set([...rowInput[uploadColumnName], ...existingAssetArray]),
		];
		body.row = rowInput;

		// attach assets to table row
		const responseData = await seaTableApiRequest.call(
			this,
			{},
			'PUT',
			'/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/',
			body,
		);

		uploadAsset[c]['upload_successful'] = responseData.success;
	}

	return this.helpers.returnJsonArray(uploadAsset as IDataObject[]);
}
