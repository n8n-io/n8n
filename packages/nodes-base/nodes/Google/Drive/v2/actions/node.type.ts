import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	drive: 'create' | 'deleteDrive' | 'get' | 'list' | 'update';
	file:
		| 'copy'
		| 'createFromText'
		| 'download'
		| 'deleteFile'
		| 'move'
		| 'share'
		| 'upload'
		| 'update';
	folder: 'create' | 'deleteFolder' | 'share';
	fileFolder: 'search';
};

export type GoogleDriveType = AllEntities<NodeMap>;
