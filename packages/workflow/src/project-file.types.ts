import type { Readable } from 'node:stream';

/**
 * A file handed to the project-files module by a node.
 *
 * The `path` source used by the multipart upload route is deliberately absent —
 * only the REST layer stages temp files on disk.
 */
export type ProjectFileNodeInput = {
	name: string;
	mimeType: string;
	/** Declared size, used for a cheap quota rejection before any bytes are written. */
	sizeBytes: number;
	source: { type: 'buffer'; buffer: Buffer } | { type: 'stream'; stream: Readable };
};

/**
 * Metadata of a stored file, as returned to the node.
 *
 * Never carries `binaryDataId`: node output is visible in the NDV and persisted
 * in execution data, and `GET /rest/binary-data?id=` performs no ownership check.
 */
export type ProjectFileNodeOutput = {
	id: string;
	name: string;
	mimeType: string;
	fileSizeBytes: number;
	projectId: string;
	createdAt: string;
	updatedAt: string;
	/** True when this replaced the content of an existing file of the same name. */
	overwritten: boolean;
};

export type IProjectFileWriteService = {
	addFile(
		file: ProjectFileNodeInput,
		options?: { overwrite?: boolean },
	): Promise<ProjectFileNodeOutput>;
};
