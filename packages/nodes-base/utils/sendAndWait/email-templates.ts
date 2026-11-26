export const BUTTON_STYLE_SECONDARY =
	'display:inline-block; text-decoration:none; background-color:#fff; color:#4a4a4a; padding:12px 24px; font-family: Arial,sans-serif; font-size:14px;font-weight:600; border:1px solid #d1d1d1; border-radius:6px; min-width:120px; margin: 12px 6px 0 6px;';
export const BUTTON_STYLE_PRIMARY =
	'display:inline-block; text-decoration:none; background-color:#ff6d5a; color: #fff; padding:12px 24px; font-family: Arial,sans-serif; font-size:14px;font-weight:600; border-radius:6px; min-width:120px; margin: 12px 2px 0 2px;';

export const ACTION_RECORDED_PAGE = `
	<html lang='en'>

	<head>
		<meta charset='UTF-8' />
		<meta name='viewport' content='width=device-width, initial-scale=1.0' />
		<link rel='icon' type='image/png' href='https://n8n.io/favicon.ico' />
		<link
			href='https://fonts.googleapis.com/css?family=Open+Sans'
			rel='stylesheet'
			type='text/css'
		/>
		<title>Action recorded</title>
		<style>
			*, ::after, ::before { box-sizing: border-box; margin: 0; padding: 0; } body { font-family:
			Open Sans, sans-serif; font-weight: 400; font-size: 12px; display: flex; flex-direction:
			column; justify-content: start; background-color: #FBFCFE; } .container { margin: auto;
			text-align: center; padding-top: 24px; width: 448px; } .card { padding: 24px;
			background-color: white; border: 1px solid #DBDFE7; border-radius: 8px; box-shadow: 0px 4px
			16px 0px #634DFF0F; margin-bottom: 16px; } .n8n-link a { color: #7E8186; font-weight: 600;
			font-size: 12px; text-decoration: none; } .n8n-link svg { display: inline-block;
			vertical-align: middle; } .header h1 { color: #525356; font-size: 20px; font-weight: 400;
			padding-bottom: 8px; } .header p { color: #7E8186; font-size: 14px; font-weight: 400; }
		</style>
	</head>

	<body>
		<div class='container'>
			<section>
				<div class='card'>
					<div class='header'>
						<h1>Got it, thanks</h1>
						<p>This page can be closed now</p>
					</div>
				</div>
				<div class='n8n-link'>
					<a
						href='https://n8n.io/?utm_source=n8n-internal&amp;utm_medium=send-and-wait'
						target='_blank'
					>
						Automated with
						<svg
							width='70'
							height='14'
							viewBox='0 0 480 96'
							fill='none'
							xmlns='http://www.w3.org/2000/svg'
							role='img'
							aria-label='n8n'
							style='vertical-align: -1.75px; margin-left: 4px'
						>
							<path
								d='M48 96C52.5 96 54 94.5 54 90V78C54 60 60 54 78 54H90C108 54 114 60 114 78V90C114 94.5 115.5 96 120 96C124.5 96 126 94.5 126 90V78C126 60 132 54 150 54H162C180 54 186 60 186 78V90C186 94.5 187.5 96 192 96C196.5 96 198 94.5 198 90V78C198 60 204 54 222 54H234C238.5 54 240 52.5 240 48C240 43.5 238.5 42 234 42H222C204 42 198 36 198 18V6C198 1.5 196.5 0 192 0C187.5 0 186 1.5 186 6V18C186 36 180 42 162 42H150C132 42 126 36 126 18V6C126 1.5 124.5 0 120 0C115.5 0 114 1.5 114 6V18C114 36 108 42 90 42H78C60 42 54 36 54 18V6C54 1.5 52.5 0 48 0C43.5 0 42 1.5 42 6V18C42 36 36 42 18 42H6C1.5 42 0 43.5 0 48C0 52.5 1.5 54 6 54H18C36 54 42 60 42 78V90C42 94.5 43.5 96 48 96Z'
								fill='#FF91AC'
							></path>
							<path
								d='M396 85.5C411.75 85.5 422.25 77.1562 422.25 64.5938C422.25 55.7812 417.562 49.3125 409.312 46.125C416.156 43.125 420 37.5 420 30.0938C420 18.375 410.438 10.5 396 10.5C381.562 10.5 372 18.375 372 30.0938C372 37.5 375.844 43.125 382.688 46.125C374.438 49.3125 369.75 55.7812 369.75 64.5938C369.75 77.1562 380.25 85.5 396 85.5ZM312 84H324V60.2812C324 46.6875 329.531 42.1875 337.688 42.1875C344.719 42.1875 348 45.4688 348 55.2188V84H360V51C360 39 353.625 31.5 340.969 31.5C332.625 31.5 327 34.9688 323.625 40.875V33H312V84ZM396 75C387.656 75 382.5 70.5938 382.5 63.2812C382.5 55.9688 387.656 51.5625 396 51.5625C404.344 51.5625 409.5 55.9688 409.5 63.2812C409.5 70.5938 404.344 75 396 75ZM396 41.625C388.781 41.625 384 37.5 384 31.3125C384 25.125 388.781 21 396 21C403.219 21 408 25.125 408 31.3125C408 37.5 403.219 41.625 396 41.625ZM432 84H444V60.2812C444 46.6875 449.531 42.1875 457.688 42.1875C464.719 42.1875 468 45.4688 468 55.2188V84H480V51C480 39 473.625 31.5 460.969 31.5C452.625 31.5 447 34.9688 443.625 40.875V33H432V84Z'
								fill='#191919'
							></path>
						</svg>
					</a>
				</div>
			</section>
		</div>
	</body>

</html>`;

export function createEmailBodyWithN8nAttribution(
	message: string,
	buttons: string,
	instanceId?: string,
) {
	const utm_campaign = instanceId ? `&utm_campaign=${instanceId}` : '';
	const n8nWebsiteLink = `https://n8n.io/?utm_source=n8n-internal&utm_medium=send-and-wait${utm_campaign}`;
	return `
<!DOCTYPE html>
<html lang='en'>

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>My form</title>
</head>

<body
	style="font-family: Arial, sans-serif; font-size: 12px; background-color: #fbfcfe; margin: 0; padding: 0;">
	<table width="100%" cellpadding="0" cellspacing="0"
		style="background-color:#fbfcfe; border: 1px solid #dbdfe7; border-radius: 8px;">
		<tr>
			<td align="center" style="padding: 24px 0;">
				<table width="448" cellpadding="0" cellspacing="0" border="0"
					style="width: 100%; max-width: 448px; background-color: #ffffff; border: 1px solid #dbdfe7; border-radius: 8px; padding: 24px; box-shadow: 0px 4px 16px rgba(99, 77, 255, 0.06);">
					<tr>
						<td
							style="text-align: center; padding-top: 8px; font-family: Arial, sans-serif; font-size: 14px; color: #7e8186;">
							<p style="white-space: pre-line;">${message}</p>
						</td>
					</tr>
					<tr>
						<td align="center" style="padding-top: 12px;">
								${buttons}
						</td>
					</tr>
				</table>

				<!-- Divider -->
				<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
					<tr>
						<td style="border-top: 0px solid #dbdfe7;"></td>
					</tr>
				</table>

				<!-- Footer -->
				<table width="100%" cellpadding="0" cellspacing="0" border="0"
					style="text-align: center; color: #7e8186; font-family: Arial, sans-serif; font-size: 12px;">
					<tr>
						<td>
							<a href=${n8nWebsiteLink}
								target="_blank" style="color: #7e8186; text-decoration: none;">Automated with
								n8n</a>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>

</html>
	`;
}

export function createEmailBodyWithoutN8nAttribution(message: string, buttons: string) {
	return `
<!DOCTYPE html>
<html lang='en'>

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>My form</title>
</head>

<body
	style="font-family: Arial, sans-serif; font-size: 12px; background-color: #fbfcfe; margin: 0; padding: 0;">
	<table width="100%" cellpadding="0" cellspacing="0"
		style="background-color:#fbfcfe; border: 1px solid #dbdfe7; border-radius: 8px;">
		<tr>
			<td align="center" style="padding: 24px 0;">
				<table width="448" cellpadding="0" cellspacing="0" border="0"
					style="width: 100%; max-width: 448px; background-color: #ffffff; border: 1px solid #dbdfe7; border-radius: 8px; padding: 24px; box-shadow: 0px 4px 16px rgba(99, 77, 255, 0.06);">
					<tr>
						<td
							style="text-align: center; padding-top: 8px; font-family: Arial, sans-serif; font-size: 14px; color: #7e8186;">
							<p style="white-space: pre-line;">${message}</p>
						</td>
					</tr>
					<tr>
						<td align="center" style="padding-top: 12px;">
								${buttons}
						</td>
					</tr>
				</table>

				<!-- Divider -->
				<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
					<tr>
						<td style="border-top: 0px solid #dbdfe7;"></td>
					</tr>
				</table>


			</td>
		</tr>
	</table>
</body>

</html>
	`;
}
