const frame = document.querySelector('#n8n');
const themeToggle = document.querySelector('#theme-toggle');
const embedTicket = document.querySelector('#embed-ticket');
const embedTitle = document.querySelector('#embed-title');
const usageWarning = document.querySelector('#usage-warning');
const dismissUsageWarning = document.querySelector('#dismiss-usage-warning');

const params = new URLSearchParams(window.location.search);
const ticket = params.get('ticket') || embedTicket.textContent;
const title = params.get('title') || embedTitle.textContent;

embedTicket.textContent = ticket;
embedTitle.textContent = title;
document.title = `${ticket} · real n8n editor`;

if (ticket === 'API-305') {
	usageWarning.hidden = false;
	dismissUsageWarning.addEventListener('click', () => {
		usageWarning.hidden = true;
		setTimeout(() => {
			usageWarning.hidden = false;
		}, 2000);
	});
} else {
	usageWarning.remove();
}

const HUB_THEME_KEY = 'oem-prototype-theme';
// The editor reads its own theme from this key at boot (LOCAL_STORAGE_THEME).
const N8N_THEME_KEY = 'N8N_THEME';

// The editor renders the left rail as `#side-menu` inside the layout's `aside#sidebar`.
const hiddenChromeCss = 'aside#sidebar, #side-menu { display: none !important; }';

// With the sidebar hidden, the brand mark moves onto the canvas.
// The editor wraps the Vue Flow canvas in this element, which is positioned.
const canvasWrapperSelector = '[data-test-id="canvas-wrapper"]';

const canvasLogoCss = `
	#oem-canvas-logo {
		position: absolute;
		top: 20px;
		left: 26px;
		z-index: 10;
		display: flex;
		align-items: center;
		/* N8nLogo spaces the wordmark with --spacing--5xs. */
		gap: 2px;
		color: inherit;
		text-decoration: none;
	}

	#oem-canvas-logo svg {
		display: block;
	}

	/* N8nLogo paints the wordmark with the text color, so it follows the theme. */
	#oem-canvas-logo .oem-canvas-logo-text path {
		fill: var(--color--text--shade-1);
	}
`;

// Same files as @n8n/design-system N8nLogo, served by the hub. They are inlined
// so the wordmark can take the editor's text color, as the sidebar mark does.
let logoMarkup = null;

const logoLoaded = Promise.all([
	fetch('/n8n-logo-icon.svg').then((res) => res.text()),
	fetch('/n8n-logo-text.svg').then((res) => res.text()),
])
	.then(([icon, text]) => {
		logoMarkup = icon + text.replace('<svg ', '<svg class="oem-canvas-logo-text" ');
	})
	.catch(() => {
		// Ignore: without the markup the canvas simply keeps no logo.
	});

let theme = localStorage.getItem(HUB_THEME_KEY) === 'dark' ? 'dark' : 'light';

function frameDocument() {
	try {
		return frame.contentDocument;
	} catch {
		// Ignore: the frame is mid-navigation.
		return null;
	}
}

// The proxy makes the frame same-origin, so the hub can style and theme it.
function syncFrame() {
	const doc = frameDocument();
	if (!doc?.head) return;

	let style = doc.querySelector('#oem-hidden-chrome');
	if (!style) {
		style = doc.createElement('style');
		style.id = 'oem-hidden-chrome';
		doc.head.append(style);
	}
	style.textContent = hiddenChromeCss + canvasLogoCss;

	const canvasWrapper = doc.querySelector(canvasWrapperSelector);
	if (logoMarkup && canvasWrapper) {
		let logo = canvasWrapper.querySelector('#oem-canvas-logo');
		if (logo && logo.tagName !== 'A') {
			logo.remove();
			logo = null;
		}
		if (!logo) {
			logo = doc.createElement('a');
			logo.id = 'oem-canvas-logo';
			logo.href = 'https://docs.n8n.io/';
			logo.target = '_blank';
			logo.rel = 'noopener noreferrer';
			logo.setAttribute('aria-label', 'n8n');
			logo.innerHTML = logoMarkup;
			canvasWrapper.append(logo);
		}
	}

	doc.body?.setAttribute('data-theme', theme);
	try {
		frame.contentWindow.localStorage.setItem(N8N_THEME_KEY, theme);
	} catch {
		// Ignore: storage is unavailable mid-navigation.
	}
}

function applyTheme() {
	document.body.setAttribute('data-theme', theme);
	themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
	themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
	localStorage.setItem(HUB_THEME_KEY, theme);
	syncFrame();
}

themeToggle.addEventListener('click', () => {
	theme = theme === 'dark' ? 'light' : 'dark';
	applyTheme();
});

frame.addEventListener('load', () => {
	syncFrame();
});

// The SPA navigates inside the frame, so re-inject chrome after route changes.
setInterval(() => {
	syncFrame();
}, 1000);

applyTheme();

// The logo markup arrives after the first sync, so place it once it is here.
void logoLoaded.then(syncFrame);
