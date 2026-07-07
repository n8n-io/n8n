import type { IDataObject } from 'n8n-workflow';

import {
	DRIVE_DEFAULT_VALUE,
	DRIVE_SHARED_WITH_ME_VALUE,
	FOLDER_DEFAULT_VALUE,
} from '../helpers/constants';

export function updateDriveScopes(
	qs: IDataObject,
	driveId?: string | null,
	defaultDrives: string[] = [DRIVE_DEFAULT_VALUE, DRIVE_SHARED_WITH_ME_VALUE],
) {
	if (driveId) {
		if (defaultDrives.includes(driveId)) {
			qs.includeItemsFromAllDrives = false;
			qs.supportsAllDrives = false;
			qs.corpora = 'user';
		} else {
			qs.driveId = driveId;
			qs.corpora = 'drive';
		}
	}
}

export function setParentFolder(
	folderId: string,
	driveId: string,
	folderIdDefault = FOLDER_DEFAULT_VALUE,
	defaultDrives: string[] = [DRIVE_DEFAULT_VALUE, DRIVE_SHARED_WITH_ME_VALUE],
) {
	if (folderId && folderId !== folderIdDefault) {
		return folderId;
	} else if (driveId && !defaultDrives.includes(driveId)) {
		return driveId;
	} else {
		return 'root';
	}
}
