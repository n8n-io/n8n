export type CrawlStatus = 'new' | 'running' | 'cancelled' | 'canceling' | 'failed' | 'finished';

export interface CrawlRequest {
	uuid: string;
	url: string;
	status: CrawlStatus;
	options: CrawlOptions;
	created_at: string;
	updated_at: string;
	number_of_documents: number;
	duration: string | null;
}

export interface CrawlOptions {
	spider_options?: SpiderOptions;
	page_options?: PageOptions;
	plugin_options?: PluginOptions;
}

export interface ResultAttachment {
	uuid: string;
	attachment: string;
	attachment_type: string;
	filename: string;
}

export interface ResultObject {
	metadata: Record<string, any>;
	[key: string]: any;
}

export interface CrawlResult {
	uuid: string;
	title: string;
	url: string;
	result: string | ResultObject;
	created_at: string;
	attachments: ResultAttachment[];
}

export interface SpiderOptions {
	max_depth?: number;
	page_limit?: number;
	allowed_domains?: string[];
	exclude_paths?: string[];
	include_paths?: string[];
}

export type ActionType = 'pdf' | 'screenshot';

export interface Action {
	type: ActionType;
}

export interface PageOptions {
	exclude_tags?: string[];
	include_tags?: string[];
	wait_time?: number;
	only_main_content?: boolean;
	include_html?: boolean;
	include_links?: boolean;
	timeout?: number;
	accept_cookies_selector?: string;
	locale?: string;
	extra_headers?: Record<string, string>;
	actions?: Action[];
}

export interface PluginOptions {
	[key: string]: any;
}

export interface CreateCrawlRequest {
	url: string;
	options?: CrawlOptions;
}

export interface CrawlEvent {
	type: 'state' | 'result';
	data: CrawlRequest | CrawlResult;
}

export interface APIError extends Error {
	response: {
		data: any;
		status: number;
		headers: Record<string, string>;
	};
}
