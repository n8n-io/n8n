import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from "n8n-core";
const BIN_STRING_REGEX = /Bin '(\d+-\d+)'/g
const BIN_URL_REGEX = /https:\/\/www\.toptal\.com\/developers\/postbin\/b\/(\d+-\d+)/g

export function parseBinId(binId: string) {
	let string_match = BIN_STRING_REGEX.exec(binId)
	let url_match = BIN_URL_REGEX.exec(binId);

	if (string_match) {
		return string_match[1];
	}

	if(url_match) {
		return url_match[1];
	}
 return binId;
}
