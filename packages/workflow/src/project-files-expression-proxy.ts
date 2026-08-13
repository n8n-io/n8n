import type {
	ProjectFileExpressionValue,
	ProjectFilesExpressionProxy,
	ProjectFilesSnapshotEntry,
} from './project-files.types';

/**
 * What `$files(...).url` previews as when no signer is available. The signing
 * secret is server-only, so editor previews can never mint a real token.
 */
export const PROJECT_FILES_URL_PLACEHOLDER = 'signed URL, generated at run time';

/**
 * Builds the `$files` expression value from a per-execution metadata snapshot.
 * The expression sandbox is synchronous, so everything here resolves from the
 * snapshot array — no I/O. `url` is minted lazily on property access: a
 * synchronous JWT sign via `signToken`, composed onto the signed download
 * route under `restApiUrl`. Without a signer (editor previews) `url` is a
 * placeholder string.
 */
export function buildProjectFilesExpressionProxy(options: {
	snapshot: ProjectFilesSnapshotEntry[];
	/** Mints a signed download token for a file id. Server-only. */
	signToken?: (fileId: string) => string;
	/** Base URL of the REST API the signed route lives under, e.g. `https://host/rest`. */
	restApiUrl?: string;
}): ProjectFilesExpressionProxy {
	const { snapshot, signToken, restApiUrl } = options;

	const toExpressionValue = (entry: ProjectFilesSnapshotEntry): ProjectFileExpressionValue => {
		let url: string | undefined;
		const value: ProjectFileExpressionValue = {
			id: entry.id,
			name: entry.name,
			mimeType: entry.mimeType,
			size: entry.size,
			updatedAt: entry.updatedAt,
			url: PROJECT_FILES_URL_PLACEHOLDER,
		};
		// Lazy: no token exists unless the expression actually reads `.url`.
		Object.defineProperty(value, 'url', {
			enumerable: true,
			get(): string {
				url ??=
					signToken && restApiUrl
						? `${restApiUrl}/files/signed?token=${encodeURIComponent(signToken(entry.id))}`
						: PROJECT_FILES_URL_PLACEHOLDER;
				return url;
			},
		});
		return value;
	};

	const byExactName = (name: string): ProjectFileExpressionValue | undefined => {
		const entry = snapshot.find((file) => file.name === name);
		return entry === undefined ? undefined : toExpressionValue(entry);
	};

	return Object.assign(byExactName, {
		all: () => snapshot.map(toExpressionValue),
	});
}
