import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { uploadFilePreSend } from '../../helpers/utils';
import {
	driveRLC,
	folderRLC,
	siteRLC,
	untilDriveSelected,
	untilSiteSelected,
} from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site to retrieve document libraries from',
	},
	{
		...driveRLC,
		description: 'Select the document library to upload to',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	{
		...folderRLC,
		description: 'Select the folder to upload the file to',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilDriveSelected,
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		default: '',
		description: 'The name of the file being uploaded',
		placeholder: 'e.g. My New File',
		required: true,
		type: 'string',
	},
	{
		displayName: 'File Contents',
		name: 'fileContents',
		default: '',
		description:
			'Find the name of input field containing the binary data to upload in the Input panel on the left, in the Binary tab',
		hint: 'The name of the input field containing the binary file data to upload',
		placeholder: 'data',
		required: true,
		routing: {
			send: {
				preSend: [uploadFilePreSend],
			},
		},
		type: 'string',
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['upload'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
