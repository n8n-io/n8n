import { IExecuteFunctions, IDataObject } from 'n8n-workflow';

export function DefineScreenshotParams(this: IExecuteFunctions, index: number) {
	const url = this.getNodeParameter('url', index) as string;

	// additional fields
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;
	const fileName = additionalFields.fileName as string;
	const format = additionalFields.format as string;
	const capture = additionalFields.capture as string;
	const resolution = additionalFields.resolution as string;
	const country = additionalFields.country as string;
	const timeout = additionalFields.timeout as string;
	const rendering_wait = additionalFields.rendering_wait as string;
	const wait_for_selector = additionalFields.wait_for_selector as string;
	const options = additionalFields.options as string[];
	const auto_scroll = additionalFields.auto_scroll === true;
	const js = additionalFields.js as string;
	const cache = additionalFields.cache === true;
	const cache_ttl = additionalFields.cache_ttl as string;
	const cache_clear = additionalFields.cache_clear === true;

	const params = new URLSearchParams({
		url: url,
	});

	if (fileName) {
		params.append('fileName', fileName);
	}

	if (format) {
		params.append('format', format);
	}

	if (capture) {
		params.append('capture', capture);
	}

	if (resolution) {
		params.append('resolution', resolution);
	}

	if (country) {
		params.append('country', country);
	}

	if (timeout) {
		params.append('timeout', timeout);
	}

	if (rendering_wait) {
		params.append('rendering_wait', rendering_wait);
	}

	if (wait_for_selector) {
		params.append('wait_for_selector', wait_for_selector);
	}

	if (options) {
		params.append('options', options.join(','));
	}

	if (auto_scroll) {
		params.append('auto_scroll', 'true');
	}

	if (js) {
		params.append('js', urlsafe_b64encode(js));
	}

	if (cache) {
		params.append('cache', 'true');

		if (cache_ttl) {
			params.append('cache_ttl', cache_ttl);
		}

		if (cache_clear) {
			params.append('cache_clear', 'true');
		}
	}

	return params;
}

function urlsafe_b64encode(data: string): string {
	const encoder = new TextEncoder();
	const encoded = encoder.encode(data);
	const base64 = btoa(String.fromCharCode(...encoded))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
	return base64;
}
