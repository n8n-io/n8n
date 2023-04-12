import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { googleApiRequest } from '../transport';

interface GoogleDriveFilesItem {
	id: string;
	name: string;
	mimeType: string;
	webViewLink: string;
}

interface GoogleDriveDriveItem {
	id: string;
	name: string;
}

export async function fileSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const query: string[] = [];
	if (filter) {
		query.push(`name contains '${filter.replace("'", "\\'")}'`);
	}
	query.push("mimeType != 'application/vnd.google-apps.folder'");
	const res = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, {
		q: query.join(' and '),
		pageToken: paginationToken,
		fields: 'nextPageToken,files(id,name,mimeType,webViewLink)',
		orderBy: 'name_natural',
	});
	return {
		results: res.files.map((i: GoogleDriveFilesItem) => ({
			name: i.name,
			value: i.id,
			url: i.webViewLink,
		})),
		paginationToken: res.nextPageToken,
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
	query.push("mimeType = 'application/vnd.google-apps.folder'");
	const res = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, {
		q: query.join(' and '),
		pageToken: paginationToken,
		fields: 'nextPageToken,files(id,name,mimeType,webViewLink)',
		orderBy: 'name_natural',
	});

	const results: INodeListSearchItems[] = [
		{
			name: '/',
			value: 'root',
		},
	];

	res.files.forEach((i: GoogleDriveFilesItem) => {
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

	const results: INodeListSearchItems[] = [
		{
			name: 'My Drive',
			value: 'root',
		},
	];

	res.drives.forEach((i: GoogleDriveDriveItem) => {
		results.push({
			name: i.name,
			value: i.id,
		});
	});

	return {
		results,
		paginationToken: res.nextPageToken,
	};
}
