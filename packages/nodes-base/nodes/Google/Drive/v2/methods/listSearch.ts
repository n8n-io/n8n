import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import type { SearchFilter } from '../helpers/interfaces';
import { DRIVE, RLC_DRIVE_DEFAULT, RLC_FOLDER_DEFAULT } from '../helpers/interfaces';
import { updateDriveScopes } from '../helpers/utils';
import { googleApiRequest } from '../transport';

interface FilesItem {
	id: string;
	name: string;
	mimeType: string;
	webViewLink: string;
}

interface DriveItem {
	id: string;
	name: string;
}

export async function fileSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const query: string[] = ['trashed = false'];
	if (filter) {
		query.push(`name contains '${filter.replace("'", "\\'")}'`);
	}
	query.push(`mimeType != '${DRIVE.FOLDER}'`);
	const res = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, {
		q: query.join(' and '),
		pageToken: paginationToken,
		fields: 'nextPageToken,files(id,name,mimeType,webViewLink)',
		orderBy: 'name_natural',
		includeItemsFromAllDrives: true,
		supportsAllDrives: true,
		spaces: 'appDataFolder, drive',
		corpora: 'allDrives',
	});
	return {
		results: res.files.map((file: FilesItem) => ({
			name: file.name,
			value: file.id,
			url: file.webViewLink,
		})),
		paginationToken: res.nextPageToken,
	};
}

export async function driveSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let res = { drives: [], nextPageToken: undefined };

	res = await googleApiRequest.call(this, 'GET', '/drive/v3/drives', undefined, {
		q: filter ? `name contains '${filter.replace("'", "\\'")}'` : undefined,
		pageToken: paginationToken,
	});

	const results: INodeListSearchItems[] = [];

	res.drives.forEach((drive: DriveItem) => {
		results.push({
			name: drive.name,
			value: drive.id,
			url: `https://drive.google.com/drive/folders/${drive.id}`,
		});
	});

	return {
		results,
		paginationToken: res.nextPageToken,
	};
}

export async function driveSearchWithDefault(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const drives = await driveSearch.call(this, filter, paginationToken);

	let results: INodeListSearchItems[] = [];

	if (filter && !RLC_DRIVE_DEFAULT.toLowerCase().includes(filter.toLowerCase())) {
		results = drives.results;
	} else {
		results = [
			{
				name: RLC_DRIVE_DEFAULT,
				value: RLC_DRIVE_DEFAULT,
				url: 'https://drive.google.com/drive/my-drive',
			},
			...drives.results,
		];
	}

	return {
		results,
		paginationToken: drives.paginationToken,
	};
}

export async function folderSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const query: string[] = [];
	if (filter) {
		query.push(`name contains '${filter.replace("'", "\\'")}'`);
	}
	query.push(`mimeType = '${DRIVE.FOLDER}'`);

	const qs: IDataObject = {
		q: query.join(' and '),
		pageToken: paginationToken,
		fields: 'nextPageToken,files(id,name,mimeType,webViewLink,parents,driveId)',
		orderBy: 'name_natural',
		includeItemsFromAllDrives: true,
		supportsAllDrives: true,
		spaces: 'appDataFolder, drive',
		corpora: 'allDrives',
	};

	let driveId;

	driveId = this.getNodeParameter('driveId', '') as IDataObject;

	if (!driveId) {
		const searchFilter = this.getNodeParameter('filter', {}) as SearchFilter;
		if (searchFilter?.driveId?.mode === 'url') {
			searchFilter.driveId.value = this.getNodeParameter('filter.folderId', undefined, {
				extractValue: true,
			}) as string;
		}
		driveId = searchFilter.driveId;
	}
	updateDriveScopes(qs, driveId?.value as string);

	const res = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, qs);

	const results: INodeListSearchItems[] = [];

	res.files.forEach((i: FilesItem) => {
		results.push({
			name: i.name,
			value: i.id,
			url: i.webViewLink,
		});
	});

	return {
		results,
		paginationToken: res.nextPageToken,
	};
}

export async function folderSearchWithDefault(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const folders = await folderSearch.call(this, filter, paginationToken);

	let results: INodeListSearchItems[] = [];
	const rootDefaultDisplayName = '/ (Root folder)';

	if (
		filter &&
		!(
			RLC_FOLDER_DEFAULT.toLowerCase().includes(filter.toLowerCase()) ||
			rootDefaultDisplayName.toLowerCase().includes(filter.toLowerCase())
		)
	) {
		results = folders.results;
	} else {
		results = [
			{
				name: rootDefaultDisplayName,
				value: RLC_FOLDER_DEFAULT,
				url: 'https://drive.google.com/drive',
			},
			...folders.results,
		];
	}

	return {
		results,
		paginationToken: folders.paginationToken,
	};
}
