import clone from 'lodash/clone';
import compact from 'lodash/compact';
import concat from 'lodash/concat';
import escapeRegExp from 'lodash/escapeRegExp';
import every from 'lodash/every';
import first from 'lodash/first';
import isArray from 'lodash/isArray';
import isString from 'lodash/isString';
import last from 'lodash/last';
import set from 'lodash/set';
import some from 'lodash/some';
import split from 'lodash/split';
import toNumber from 'lodash/toNumber';
import toString from 'lodash/toString';
import trim from 'lodash/trim';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodePropertyOptions,
	IWebhookFunctions,
} from 'n8n-workflow';

export async function koBoToolboxApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('koBoToolboxApi');

	// Set up pagination / scrolling
	const returnAll = !!option.returnAll;
	if (returnAll) {
		// Override manual pagination options
		set(option, 'qs.limit', 3000);
		// Don't pass this custom param to helpers.httpRequest
		delete option.returnAll;
	}

	const options: IHttpRequestOptions = {
		url: '',
		headers: {
			Accept: 'application/json',
		},
		json: true,
	};
	if (Object.keys(option)) {
		Object.assign(options, option);
	}
	if (options.url && !/^http(s)?:/.test(options.url)) {
		options.url = (credentials.URL as string) + options.url;
	}

	let results = null;
	let keepLooking = true;
	while (keepLooking) {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'koBoToolboxApi',
			options,
		);
		// Append or set results
		results = response.results ? concat(results || [], response.results) : response;
		if (returnAll && response.next) {
			options.url = response.next;
		} else {
			keepLooking = false;
		}
	}

	return results;
}

export async function koBoToolboxRawRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	option: IHttpRequestOptions,
): Promise<any> {
	const credentials = await this.getCredentials('koBoToolboxApi');

	if (option.url && !/^http(s)?:/.test(option.url)) {
		option.url = (credentials.URL as string) + option.url;
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'koBoToolboxApi', option);
}

function parseGeoPoint(geoPoint: string): null | number[] {
	// Check if it looks like a "lat lon z precision" flat string e.g. "-1.931161 30.079811 0 0" (lat, lon, elevation, precision)
	// NOTE: we are discarding the elevation and precision values since they're not (well) supported in GeoJSON
	const coordinates = split(geoPoint, ' ');
	if (
		coordinates.length >= 2 &&
		every(coordinates, (coord) => coord && /^-?\d+(?:\.\d+)?$/.test(toString(coord)))
	) {
		// NOTE: GeoJSON uses lon, lat, while most common systems use lat, lon order!
		return [toNumber(coordinates[1]), toNumber(coordinates[0])];
	}
	return null;
}

export function parseStringList(value: string): string[] {
	return split(toString(value), /[\s,]+/);
}

const matchWildcard = (value: string, pattern: string): boolean => {
	const regex = new RegExp(`^${escapeRegExp(pattern).replace('\\*', '.*')}$`);
	return regex.test(value);
};

const formatValue = (value: any, format: string): any => {
	if (isString(value)) {
		// Sanitize value
		value = toString(value);

		// Parse geoPoints
		const geoPoint = parseGeoPoint(value as string);
		if (geoPoint) {
			return {
				type: 'Point',
				coordinates: geoPoint,
			};
		}

		// Check if it's a closed polygon geo-shape: -1.954117 30.085159 0 0;-1.955005 30.084622 0 0;-1.956057 30.08506 0 0;-1.956393 30.086229 0 0;-1.955853 30.087143 0 0;-1.954609 30.08725 0 0;-1.953966 30.086735 0 0;-1.953805 30.085897 0 0;-1.954117 30.085159 0 0
		const points = value.split(';');
		if (points.length >= 2 && /^[-\d\.\s;]+$/.test(value as string)) {
			// Using the GeoJSON format as per https://geojson.org/
			const coordinates = compact(points.map(parseGeoPoint) as number[]);
			// Only return if all values are properly parsed
			if (coordinates.length === points.length) {
				// If the shape is closed, declare it as Polygon, otherwise as LineString

				if (first(points) === last(points)) {
					return {
						type: 'Polygon',
						coordinates: [coordinates],
					};
				}

				return { type: 'LineString', coordinates };
			}
		}

		// Parse numbers
		if ('number' === format) {
			return toNumber(value);
		}

		// Split multi-select
		if ('multiSelect' === format) {
			return split(toString(value), ' ');
		}
	}

	return value;
};

export function formatSubmission(
	submission: IDataObject,
	selectMasks: string[] = [],
	numberMasks: string[] = [],
): IDataObject {
	// Create a shallow copy of the submission
	const response = {} as IDataObject;

	for (const key of Object.keys(submission)) {
		let value = clone(submission[key]);
		// Sanitize key names: split by group, trim _
		const sanitizedKey = key
			.split('/')
			.map((k) => trim(k, ' _'))
			.join('.');
		const leafKey = sanitizedKey.split('.').pop() || '';
		let format = 'string';
		if (some(numberMasks, (mask) => matchWildcard(leafKey, mask))) {
			format = 'number';
		}
		if (some(selectMasks, (mask) => matchWildcard(leafKey, mask))) {
			format = 'multiSelect';
		}

		value = formatValue(value, format);

		set(response, sanitizedKey, value);
	}

	// Reformat _geolocation
	if (
		isArray(response.geolocation) &&
		response.geolocation.length === 2 &&
		response.geolocation[0] &&
		response.geolocation[1]
	) {
		response.geolocation = {
			type: 'Point',
			coordinates: [response.geolocation[1], response.geolocation[0]],
		};
	}

	return response;
}

export async function downloadAttachments(
	this: IExecuteFunctions | IWebhookFunctions,
	submission: IDataObject,
	options: IDataObject,
): Promise<INodeExecutionData> {
	// Initialize return object with the original submission JSON content
	const binaryItem: INodeExecutionData = {
		json: {
			...submission,
		},
		binary: {},
	};

	const credentials = await this.getCredentials('koBoToolboxApi');

	// Look for attachment links - there can be more than one
	const attachmentList = (submission._attachments || submission.attachments) as any[];

	if (attachmentList?.length) {
		for (const [index, attachment] of attachmentList.entries()) {
			// look for the question name linked to this attachment
			const fileName = attachment.filename;
			const sanitizedFileName = toString(fileName).replace(/_[^_]+(?=\.\w+)/, ''); // strip suffix

			let relatedQuestion = null;
			if ('question' === options.binaryNamingScheme) {
				for (const question of Object.keys(submission)) {
					// The logic to map attachments to question is sometimes ambiguous:
					// - If the attachment is linked to a question, the question's value is the same as the attachment's filename (with spaces replaced by underscores)
					// - BUT sometimes the attachment's filename has an extra suffix, e.g. "My_Picture_0OdlaKJ.jpg", would map to the question "picture": "My Picture.jpg"
					const sanitizedQuestionValue = toString(submission[question]).replace(/\s/g, '_'); // replace spaces with underscores
					if (sanitizedFileName === sanitizedQuestionValue) {
						relatedQuestion = question;
						// Just use the first match...
						break;
					}
				}
			}

			// Download attachment
			// NOTE: this needs to follow redirects (possibly across domains), while keeping Authorization headers
			// The Axios client will not propagate the Authorization header on redirects (see https://github.com/axios/axios/issues/3607), so we need to follow ourselves...
			let response = null;
			const attachmentUrl =
				attachment[options.version as string] || (attachment.download_url as string);
			let final = false,
				redir = 0;

			const axiosOptions: IHttpRequestOptions = {
				url: attachmentUrl,
				method: 'GET',
				headers: {
					Authorization: `Token ${credentials.token}`,
				},
				ignoreHttpStatusErrors: true,
				returnFullResponse: true,
				disableFollowRedirect: true,
				encoding: 'arraybuffer',
			};

			while (!final && redir < 5) {
				response = await this.helpers.httpRequest(axiosOptions);

				if (response?.headers.location) {
					// Follow redirect
					axiosOptions.url = response.headers.location;
					redir++;
				} else {
					final = true;
				}
			}

			if (response?.body) {
				// Use the provided prefix if any, otherwise try to use the original question name
				let binaryName;
				if ('question' === options.binaryNamingScheme && relatedQuestion) {
					binaryName = relatedQuestion;
				} else {
					binaryName = `${options.dataPropertyAttachmentsPrefixName || 'attachment_'}${index}`;
				}

				binaryItem.binary![binaryName] = await this.helpers.prepareBinaryData(
					response.body as Buffer,
					fileName as string,
				);
			}
		}
	} else {
		delete binaryItem.binary;
	}

	// Add item to final output - even if there's no attachment retrieved
	return binaryItem;
}

export async function loadForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const responseData = await koBoToolboxApiRequest.call(this, {
		url: '/api/v2/assets/',
		qs: {
			q: 'asset_type:survey',
			ordering: 'name',
		},
		scroll: true,
	});

	return responseData?.map((survey: any) => ({ name: survey.name, value: survey.uid })) || [];
}
