export const replaceSingleQuotes = (responseBody: string) => {
	return responseBody.replace(/'/g, '&#39;');
};

/*
 * To prevent XSS and CSRF, we sanitize the response body by wrapping it in an iframe.
 * This prevents the API from being accessed since the iframe origin will be empty.
 */
export const sandboxResponseData = (responseBody: string) => {
	const parsedResponseBody = replaceSingleQuotes(responseBody);

	return `
		<iframe srcdoc='${parsedResponseBody}'
			style="position:fixed; top:0; left:0; width:100vw; height:100vh; border:none; overflow:auto;"
			allowtransparency="true">
		</iframe>`;
};
