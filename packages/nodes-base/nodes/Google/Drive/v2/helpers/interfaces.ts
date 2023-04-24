export const UPLOAD_CHUNK_SIZE = 256 * 1024;

export type SearchFilter = {
	driveId: {
		value: string;
	};
	folderId: {
		value: string;
	};
	whatToSearch: 'all' | 'files' | 'folders';
	fileTypes?: string[];
};

export const enum RlcDefaults {
	Drive = 'My Drive',
	Folder = 'root',
}
