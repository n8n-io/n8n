import { IExecuteFunctions, IDataObject } from 'n8n-workflow';

interface Headers {
	headers: {
		name: string;
		value: string;
	}[];
}

type Screenshots = {
	screenshots: {
		name: string;
		selector: string;
	}[];
};

export function DefineScrapeParams(this: IExecuteFunctions, index: number) {
	const url = this.getNodeParameter('url', index) as string;
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	// additional fields
	const body = additionalFields.body as string;
	let headers = additionalFields.headers as Headers;
	const retry = !additionalFields.hasOwnProperty('retry') || additionalFields.retry === true;
	const timeout = additionalFields.timeout as string;
	const proxy_pool = additionalFields.proxy_pool as string;
	const country = additionalFields.country as string;
	const asp = additionalFields.asp === true;
	const cost_budget = additionalFields.cost_budget as string;
	const render_js = additionalFields.render_js === true;
	const auto_scroll = additionalFields.auto_scroll === true;
	const rendering_wait = additionalFields.rendering_wait as string;
	const rendering_stage = additionalFields.rendering_stage as string;
	const wait_for_selector = additionalFields.wait_for_selector as string;
	const js = additionalFields.js as string;
	const js_scenario = additionalFields.js_scenario as string;
	let screenshots = additionalFields.screenshots as Screenshots;
	const screenshot_flags = additionalFields.screenshot_flags as string[];
	let format = additionalFields.format as string;
	const format_options = additionalFields.format_options as string[];
	const extraction_template = additionalFields.extraction_template as string;
	const extraction_prompt = additionalFields.extraction_prompt as string;
	const extraction_model = additionalFields.extraction_model as string;
	const session = additionalFields.session as string;
	const session_sticky_proxy = additionalFields.session_sticky_proxy === true;
	const cache = additionalFields.cache === true;
	const cache_ttl = additionalFields.cache_ttl as string;
	const cache_clear = additionalFields.cache_clear === true;
	const proxified_response = additionalFields.proxified_response === true;
	const debug = additionalFields.debug === true;
	const tags = additionalFields.tags as { tags: { Tag: string }[] };
	const os = additionalFields.os as string;
	const lang = additionalFields.lang as string;
	const geolocation = additionalFields.geolocation as string;
	const dns = additionalFields.dns === true;
	const ssl = additionalFields.ssl === true;
	const correlation_id = additionalFields.correlation_id as string;
	const webhook_name = additionalFields.webhook_name as string;

	const params = new URLSearchParams({
		url: url,
		retry: retry ? 'true' : 'false',
		proxy_pool: proxy_pool || 'public_datacenter_pool',
		asp: asp ? 'true' : 'false',
		render_js: render_js ? 'true' : 'false',
		session_sticky_proxy: session_sticky_proxy ? 'true' : 'false',
		cache: cache ? 'true' : 'false',
		proxified_response: proxified_response ? 'true' : 'false',
		debug: debug ? 'true' : 'false',
		dns: dns ? 'true' : 'false',
		ssl: ssl ? 'true' : 'false',
	});

	if (body) {
		params.append('body', body);
	}

	if (headers) {
		for (const header of headers.headers) {
			if (header.name && header.value) {
				params.append(`headers[${header.name}]`, header.value);
			}
		}
	}

	if (timeout) {
		params.append('timeout', timeout);
	}

	if (country) {
		params.append('country', country);
	}

	if (cost_budget) {
		params.append('cost_budget', cost_budget);
	}

	if (render_js) {
		if (auto_scroll) {
			params.append('auto_scroll', 'true');
		}

		if (rendering_wait) {
			params.append('rendering_wait', rendering_wait);
		}

		if (rendering_stage) {
			params.append('rendering_stage', rendering_stage);
		}

		if (wait_for_selector) {
			params.append('wait_for_selector', wait_for_selector);
		}

		if (js) {
			params.append('js', urlsafe_b64encode(js));
		}

		if (js_scenario) {
			const encoded_js_scenario = urlsafe_b64encode(js_scenario);
			params.append('js_scenario', encoded_js_scenario);
		}
	}

	if (format) {
		if (format === 'markdown' && format_options.length > 0) {
			format = 'markdown:' + format_options.join(',');
		}

		params.append('format', format);
	}

	if (screenshots) {
		for (const screenshot of screenshots.screenshots) {
			if (screenshot.name && screenshot.selector) {
				params.append(`screenshots[${screenshot.name}]`, screenshot.selector);
			}
		}

		if (screenshot_flags) {
			params.append('screenshot_flags', screenshot_flags.join(','));
		}
	}

	if (extraction_template) {
		const encoded_extraction_template = urlsafe_b64encode(extraction_template);
		params.append('extraction_template', 'ephemeral:' + encoded_extraction_template);
	}

	if (extraction_prompt) {
		params.append('extraction_prompt', extraction_prompt);
	}

	if (extraction_model) {
		params.append('extraction_model', extraction_model);
	}

	if (session) {
		params.append('session', session);
	}

	if (cache) {
		if (cache_ttl) {
			params.append('cache_ttl', cache_ttl);
		}

		if (cache_clear) {
			params.append('cache_clear', 'true');
		}
	}

	if (tags) {
		const tagStrings = tags.tags.map((tagObject) => tagObject.Tag);
		params.append('tags', tagStrings.join(','));
	}

	if (os) {
		params.append('os', os);
	}

	if (lang) {
		params.append('lang', lang);
	}

	if (geolocation) {
		params.append('geolocation', geolocation);
	}

	if (correlation_id) {
		params.append('correlation_id', correlation_id);
	}

	if (webhook_name) {
		params.append('webhook_name', webhook_name);
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
