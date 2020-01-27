
import { JWT } from 'google-auth-library';
import { google } from 'googleapis';


/**
 * Returns the authentication client needed to access spreadsheet
 */
export async function getAuthenticationClient(email: string, privateKey: string, scopes: string[]): Promise <JWT> {
	const client = new google.auth.JWT(
		email,
		undefined,
		privateKey,
		scopes,
		undefined
	);

	// TODO: Check later if this or the above should be cached
	await client.authorize();

	// @ts-ignore
	return client;
}
