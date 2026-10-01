import type { CheerioAPI } from 'cheerio';

export type Cheerio = ReturnType<CheerioAPI>;

export interface IValueData {
	attribute?: string;
	skipSelectors?: string;
	cssSelector: string;
	returnValue: string;
	key: string;
	returnArray: boolean;
}
