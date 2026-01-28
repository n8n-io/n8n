import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import {
	driveRLC,
	fileRLC,
	folderRLC,
	siteRLC,
	untilDriveSelected,
	untilFolderSelected,
	untilSiteSelected,
} from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site to retrieve document libraries from',
	},
	{
		...driveRLC,
		description: 'Select the document library to browse',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	{
		...folderRLC,
		description: 'Select the folder to download the file from',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilDriveSelected,
			},
		},
	},
	{
		...fileRLC,
		description: 'Select the file to download',
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilDriveSelected,
				...untilFolderSelected,
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['download'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
