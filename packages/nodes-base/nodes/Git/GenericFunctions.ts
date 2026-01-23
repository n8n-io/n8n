import type { ConfigListSummary } from 'simple-git';

const REMOTE_ORIGIN_URL_KEY = 'remote.origin.url';

const REMOTE_ORIGIN_PUSH_URL_KEY = 'remote.origin.pushurl';

function sanitizeUrl(url: string): string {
	const urlObj = new URL(url);
	urlObj.username = '';
	urlObj.password = '';
	return urlObj.toString();
}

export function mapGitConfigList(config: ConfigListSummary) {
	const data = [];
	for (const fileName of Object.keys(config.values)) {
		let remoteOriginUrl = config.values[fileName][REMOTE_ORIGIN_URL_KEY];
		if (remoteOriginUrl) {
			if (Array.isArray(remoteOriginUrl)) {
				remoteOriginUrl = remoteOriginUrl.map(sanitizeUrl);
			} else {
				remoteOriginUrl = sanitizeUrl(remoteOriginUrl);
			}
		}

		let remoteOriginPushUrl = config.values[fileName][REMOTE_ORIGIN_PUSH_URL_KEY];
		if (remoteOriginPushUrl) {
			if (Array.isArray(remoteOriginPushUrl)) {
				remoteOriginPushUrl = remoteOriginPushUrl.map(sanitizeUrl);
			} else {
				remoteOriginPushUrl = sanitizeUrl(remoteOriginPushUrl);
			}
		}

		data.push({
			_file: fileName,
			...config.values[fileName],
			[REMOTE_ORIGIN_URL_KEY]: remoteOriginUrl,
			[REMOTE_ORIGIN_PUSH_URL_KEY]: remoteOriginPushUrl,
		});
	}
	return data;
}
