import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { googleApiRequest } from './GenericFunctions';

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
	return {
		results: res.files.map((i: GoogleDriveFilesItem) => ({
			name: i.name,
			value: i.id,
			url: i.webViewLink,
		})),
		paginationToken: res.nextPageToken,
	};
}

export async function driveSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const res = await googleApiRequest.call(this, 'GET', '/drive/v3/drives', undefined, {
		q: filter ? `name contains '${filter.replace("'", "\\'")}'` : undefined,
		pageToken: paginationToken,
	});
	return {
		results: res.drives.map((i: GoogleDriveDriveItem) => ({
			name: i.name,
			value: i.id,
		})),
		paginationToken: res.nextPageToken,
	};
}
