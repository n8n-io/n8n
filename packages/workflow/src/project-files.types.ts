import type { Readable } from 'stream';

/**
 * Project files ("Files" feature): named, mutable, project-scoped blobs.
 * Used by the Files node (n8n-nodes-base.files) through the file-storage
 * module's proxy service.
 */
export type ProjectFileMetadata = {
	id: string;
	name: string;
	mimeType: string;
	sizeBytes: number;
	createdAt: Date;
	updatedAt: Date;
};

/** How a write behaves when the target name already exists in the project. */
export type ProjectFilesConflictMode = 'replace' | 'keepBoth' | 'error';

/**
 * Files node operations
 * Used by the Files node (n8n-nodes-base.files) for file-level operations
 */
export type ProjectFilesOperation = 'download' | 'upload' | 'getMany' | 'deleteFile';

export type ListProjectFilesSortByKey = 'name' | 'sizeBytes' | 'updatedAt';

export type ListProjectFilesOptions = {
	filter?: { name?: string };
	sortBy?: `${ListProjectFilesSortByKey}:asc` | `${ListProjectFilesSortByKey}:desc`;
	take?: number;
	skip?: number;
};

export type ProjectFileDownloadResult = {
	metadata: ProjectFileMetadata;
	/** Content bytes; the caller copies them into execution binary data. */
	stream: Readable;
};

/**
 * What a `$files('name')` expression resolves to: metadata from the
 * per-execution snapshot plus a short-lived signed download URL — never bytes.
 * `url` is implemented as a lazy getter: no token is minted unless the
 * expression actually reads the property.
 */
export type ProjectFileExpressionValue = {
	id: string;
	name: string;
	mimeType: string;
	/** Content size in bytes. */
	size: number;
	/** ISO-8601 timestamp of the last change. */
	updatedAt: string;
	/**
	 * Short-lived signed download URL. In the editor — where the signing secret
	 * does not exist — this is a placeholder string instead.
	 */
	url: string;
};

/** One row of the per-execution metadata snapshot backing `$files`. */
export type ProjectFilesSnapshotEntry = Omit<ProjectFileExpressionValue, 'url'>;

/**
 * The `$files` additional key: callable by exact file name — an unknown name
 * resolves to `undefined`, matching `$vars` miss behavior — with `.all()`
 * returning every file of the workflow's home project.
 */
export type ProjectFilesExpressionProxy = ((
	name: string,
) => ProjectFileExpressionValue | undefined) & {
	all(): ProjectFileExpressionValue[];
};

// APIs for a project files service operating on a specific projectId.
// Unlike data tables there is no per-resource sub-service: files have no
// row/column sub-resources, so one aggregate-shaped service covers every
// operation, addressing files by id or name.
export interface IProjectFilesService {
	getProjectId(): string;

	getManyAndCount(
		options: ListProjectFilesOptions,
	): Promise<{ count: number; data: ProjectFileMetadata[] }>;

	/** Resolves a file by its exact name, or null when the project has none. */
	findByName(name: string): Promise<ProjectFileMetadata | null>;

	download(fileId: string): Promise<ProjectFileDownloadResult>;

	upload(
		name: string,
		data: Readable | Buffer,
		meta: { mimeType?: string },
		conflictMode: ProjectFilesConflictMode,
	): Promise<ProjectFileMetadata>;

	deleteFile(fileId: string): Promise<{ name: string }>;
}
