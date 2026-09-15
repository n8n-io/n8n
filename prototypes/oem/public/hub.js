const prototypes = [
	{
		title: 'Display n8n logo on canvas when N8N_CANVAS_ONLY is enabled',
		body: 'API-317',
		href: 'https://linear.app/n8n/issue/API-317/display-n8n-logo-on-canvas-when-n8n-canvas-only-is-enabled#comment-d290240d',
		mock: '/n8n-embed.html',
	},
	{
		title: 'Add mechanism to enforce airgapped usage reporting via license feature flag',
		body: 'API-305',
		href: 'https://linear.app/n8n/issue/API-305/add-mechanism-to-enforce-airgapped-usage-reporting-via-license-feature#comment-3207db55',
		mock: '/n8n-embed.html',
		embedTicket: 'API-305',
	},
];

function prototypeUrl(item) {
	if (!item.embedTicket) return item.mock;

	const params = new URLSearchParams({
		ticket: item.embedTicket,
		title: item.title,
	});
	return `${item.mock}?${params}`;
}

const root = document.querySelector('#prototypes');
root.replaceChildren(
	...prototypes.map((item) => {
		const card = document.createElement('article');
		card.className = 'card';

		const title = document.createElement('h2');
		if (item.mock) {
			const titleLink = document.createElement('a');
			titleLink.href = prototypeUrl(item);
			titleLink.target = '_blank';
			titleLink.rel = 'noopener noreferrer';
			titleLink.textContent = item.title;
			title.append(titleLink);
		} else {
			title.textContent = item.title;
		}

		const body = document.createElement('p');
		if (item.href) {
			const link = document.createElement('a');
			link.href = item.href;
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
			link.textContent = item.body;
			body.append(link);
		} else {
			body.textContent = item.body;
		}

		card.append(title, body);
		return card;
	}),
);
