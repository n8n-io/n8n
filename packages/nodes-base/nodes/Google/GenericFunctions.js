import { formatPemBlock } from '@n8n/utils/format-pem-block';
import * as jwt from 'jsonwebtoken';
import { DateTime } from 'luxon';
import moment from 'moment-timezone';
import { NodeOperationError, } from 'n8n-workflow';
export const googleServiceAccountScopes = {
    bigquery: ['https://www.googleapis.com/auth/bigquery'],
    books: ['https://www.googleapis.com/auth/books'],
    chat: ['https://www.googleapis.com/auth/chat.bot'],
    docs: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
    ],
    drive: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.appdata',
        'https://www.googleapis.com/auth/drive.photos.readonly',
    ],
    gmail: [
        'https://www.googleapis.com/auth/gmail.labels',
        'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
        'https://www.googleapis.com/auth/gmail.addons.current.message.action',
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.compose',
    ],
    sheetV1: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets',
    ],
    sheetV2: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.metadata',
    ],
    sheetV2Trigger: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata',
        'https://www.googleapis.com/auth/drive.readonly',
    ],
    slides: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/presentations',
    ],
    translate: [
        'https://www.googleapis.com/auth/cloud-translation',
        'https://www.googleapis.com/auth/cloud-platform',
    ],
    firestore: [
        'https://www.googleapis.com/auth/datastore',
        'https://www.googleapis.com/auth/firebase',
    ],
    cloudStorage: [
        'https://www.googleapis.com/auth/devstorage.full_control',
        'https://www.googleapis.com/auth/cloud-platform',
    ],
    vertex: ['https://www.googleapis.com/auth/cloud-platform'],
};
export async function getGoogleAccessToken(credentials, service) {
    //https://developers.google.com/identity/protocols/oauth2/service-account#httprest
    const scopes = googleServiceAccountScopes[service];
    const privateKey = formatPemBlock(credentials.privateKey);
    credentials.email = (credentials.email || '').trim();
    const now = moment().unix();
    const signature = jwt.sign({
        iss: credentials.email,
        sub: credentials.delegatedEmail || credentials.email,
        scope: scopes.join(' '),
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }, privateKey, {
        algorithm: 'RS256',
        header: {
            typ: 'JWT',
            alg: 'RS256',
        },
    });
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        form: {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: signature,
        },
        uri: 'https://oauth2.googleapis.com/token',
        json: true,
    };
    return await this.helpers.request(options);
}
export function validateAndSetDate(filter, key, timezone, context) {
    const date = DateTime.fromISO(filter[key]);
    if (date.isValid) {
        filter[key] = date.setZone(timezone).toISO();
    }
    else {
        throw new NodeOperationError(context.getNode(), `The value "${filter[key]}" is not a valid DateTime.`);
    }
}
//# sourceMappingURL=GenericFunctions.js.map