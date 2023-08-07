import type cheerio from 'cheerio';

export type Cheerio = ReturnType<typeof cheerio>;

export interface IValueData {
	attribute?: string;
	cssSelector: string;
	returnValue: string;
	key: string;
	returnArray: boolean;
}
