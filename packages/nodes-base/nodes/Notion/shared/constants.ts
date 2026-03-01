const notionIdRegexp = '[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}';

export const idExtractionRegexp = `^(${notionIdRegexp})`;
export const idValidationRegexp = `${idExtractionRegexp}.*`;

const baseUrlRegexp = '(?:https|http)://www\\.notion\\.so/(?:[a-z0-9-]{2,}/)?';

export const databaseUrlExtractionRegexp = `${baseUrlRegexp}(${notionIdRegexp})`;
export const databaseUrlValidationRegexp = `${databaseUrlExtractionRegexp}.*`;

export const databasePageUrlExtractionRegexp = `${baseUrlRegexp}(?:[a-zA-Z0-9-]{1,}-)?(${notionIdRegexp})`;
export const databasePageUrlValidationRegexp = `${databasePageUrlExtractionRegexp}.*`;

export const blockUrlExtractionRegexp = `${baseUrlRegexp}(?:[a-zA-Z0-9-]{2,}-)?(${notionIdRegexp})`;
export const blockUrlValidationRegexp = `${blockUrlExtractionRegexp}.*`;
