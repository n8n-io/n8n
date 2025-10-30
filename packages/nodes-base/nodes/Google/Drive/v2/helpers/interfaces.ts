export const UPLOAD_CHUNK_SIZE = 256 * 1024;

export type SearchFilter = {
	driveId?: {
		value: string;
		mode: string;
	};
	folderId?: {
		value: string;
		mode: string;
	};
	whatToSearch?: 'all' | 'files' | 'folders';
	fileTypes?: string[];
	includeTrashed?: boolean;
};

export const RLC_DRIVE_DEFAULT = 'My Drive';
export const RLC_FOLDER_DEFAULT = 'root';

export const DRIVE = {
	FOLDER: 'application/vnd.google-apps.folder',
	AUDIO: 'application/vnd.google-apps.audio',
	DOCUMENT: 'application/vnd.google-apps.document',
	SDK: 'application/vnd.google-apps.drive-sdk',
	DRAWING: 'application/vnd.google-apps.drawing',
	FILE: 'application/vnd.google-apps.file',
	FORM: 'application/vnd.google-apps.form',
	FUSIONTABLE: 'application/vnd.google-apps.fusiontable',
	MAP: 'application/vnd.google-apps.map',
	PHOTO: 'application/vnd.google-apps.photo',
	PRESENTATION: 'application/vnd.google-apps.presentation',
	APP_SCRIPTS: 'application/vnd.google-apps.script',
	SITES: 'application/vnd.google-apps.sites',
	SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
	UNKNOWN: 'application/vnd.google-apps.unknown',
	VIDEO: 'application/vnd.google-apps.video',
} as const;
