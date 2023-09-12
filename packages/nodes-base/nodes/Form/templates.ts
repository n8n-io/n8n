import type { FormField } from './interfaces';

const styles = `
*,
::after,
::before {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}

body {
	font-family: sans-serif;
	font-weight: 400;
	font-size: 12px;
	display: flex;
	flex-direction: column;
	justify-content: start;
}

.container {
	margin: 1em auto;
	text-align: center;
	min-width: 30em;
	max-width: 50em;
	padding: 1em;

}

.n8n-link {
	color: grey;
	margin: 1em;
	font-weight: 400;
	font-size: 1.2em;
}

.n8n-link a {
	color: grey;
	font-weight: 400;
	font-size: 1.2em;
	text-decoration: none;
}

.n8n-link strong {
	color: black;
	font-weight: 700;
	font-size: 1.3em;
}

.n8n-link img {
	display: inline-block;
	vertical-align: middle;
}

.form-header {
	color: grey;
	margin-top: 2em;
	margin-bottom: 3em;
	font-size: 1em;
	border-radius: 0.5em;
}

.form-header h1 {
	/* margin-top: 2em; */
	font-size: 2em;
	font-weight: 600;
}

.form-header p {
	margin: 1em auto;
	font-size: 1.3em;
	font-weight: 500;

}

.test-notice {
	color: #ebb360;
	margin: 3em auto;
	background-color: #fefaf6;
	margin: 1.5em 1em;
	padding: 0 1em;
	font-weight: 700;
	font-size: 1.3em;
	border-radius: .5em;
	border: 0.1em solid #ebb360;
	text-align: left;
}

.test-notice p {
	margin: 1.5em 0.5em;
	font-weight: 500;
	opacity: 0.8;
}

.card {
	margin: 1em;
	padding: 0.5em 1em;
	background-color: white;
	border: 0.1em solid lightgray;
	border-radius: 0.5em;
	box-shadow: 0 0.3em 2em rgba(0, 0, 0, 0.1);
	min-width: 40em;
}

form label {
	display: block;
	text-align: left;
	font-size: 1.3em;
	font-weight: 700;
	color: #555555;
	padding-bottom: .5em;
	padding-left: .5em;
}

form .form-input {
	border: 0.1em solid lightgray;
	border-radius: 0.5em;
	padding: 1em;
	width: 98%;
	font-size: 1.3em;
	color: grey;
}

form .form-group {
	width: 100%;
	margin-bottom: .5em;
}

form input::placeholder {
	font-weight: 700;
	font-size: 1em;
}

form input:focus {
	color: grey;
}


form select.form-input {
	border: 0.1em solid lightgray;
	border-radius: 0.5em;
	padding: 1em;
	width: 98%;
	font-size: 1.3em;
	color: grey;
	background-color: white;
}

form select.form-input option {
	font-size: 1.2em;
	padding: 1em;
	background-color: white;
	color: grey;
}

.error-hidden {
	display: block;
	position: relative;
	color: #ff6d5a;
	text-align: right;
	font-size: 1em;
	font-weight: 400;
	font-style: italic;
	visibility: hidden;
	padding: .5em;
}

.error-show {
	visibility: visible;
}

#submit-btn {
	width: 98%;
	margin-bottom: 2em;
	margin-top: 2em;
	padding: 1em;
	border-radius: 0.5em;
	border: 0;
	font-size: 1.3em;
	font-weight: 600;
	background-color: #ff6d5a;
	color: white;
	cursor: pointer;
}

#submit-btn:hover {
	opacity: 0.5;
}
`;

const testNotice = `
<div class="test-notice">
<p>
	This is test version of your form. Use it only for testing your Form Trigger.
</p>
</div>
`;

const automatedWith = `
<div class="n8n-link">
<a href="https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger&utm_campaign=12345" target="_blank">
	Form automated with <img src="https://n8n.io/favicon.ico" alt="n8n logo"> <strong>n8n</strong>
</a>
</div>
`;

const submittedTestMessage = (testRun: boolean) => {
	return `
	<div class="card" id="submitted-form" style="display: none;">
	<div class="form-header">
		<h1>Form Submited</h1>
		<p>
			${
				testRun
					? 'Go back to the n8n editor and close this window'
					: 'Refresh this page to make another submission'
			}
		</p>
	</div>
	</div>
	`;
};

const prepareFormGroups = (formFields: FormField[]) => {
	let formHtml = '';
	let variables = '';
	let validationCases = '';

	for (const [index, field] of formFields.entries()) {
		const { fieldType, requiredField } = field;
		const fieldLabel = (field.fieldLabel ?? '').replace(/ /g, '___');

		const required = requiredField ? 'required' : '';

		formHtml += '<div class="form-group">';

		if (fieldType === 'dropdown') {
			const fieldOptions = field.fieldOptions?.values ?? [];

			formHtml += `<label class="form-label" for="${fieldLabel}">${field.fieldLabel}</label>`;
			formHtml += `<select class="form-input" id="${fieldLabel}" name="${fieldLabel}" ${required}>`;
			formHtml += '<option value="" disabled selected>Select an option</option>';
			for (const entry of fieldOptions) {
				formHtml += `<option value="${entry.option}">${entry.option}</option>`;
			}
			formHtml += '</select>';
		} else {
			formHtml += `<label class="form-label" for="${fieldLabel}">${field.fieldLabel}</label>`;
			formHtml += `<input class="form-input" type="${fieldType}" id="${fieldLabel}" name="${fieldLabel}" ${required}/>`;
		}

		if (requiredField) {
			formHtml += `
			<p class="error-${fieldLabel} error-hidden">
				"${field.fieldLabel}" cannot be empty
			</p>`;

			variables += `
				const input${index} = document.querySelector('#${fieldLabel}');
				const error${index} = document.querySelector('.error-${fieldLabel}');
			`;

			validationCases += `
				if (input${index}.value === '') {
					error${index}.classList.add('error-show');
					valid = false;
				} else {
					error${index}.classList.remove('error-show');
				}
			`;
		}

		formHtml += '</div>';
	}

	return { formHtml, variables, validationCases };
};

const createForm = (formTitle: string, formDescription: string, form: string) => {
	return `
	<form class="card" action='#' method='POST' name='n8n-form' id='n8n-form' novalidate>
		<div class="form-header">
			<h1>${formTitle}</h1>
			<p>
				${formDescription}
			</p>
		</div>

		<div class="item">
			${form}
		</div>

		<button id="submit-btn" type="submit">Submit form</button>
	</form>
	`;
};

export const createPage = (
	formTitle: string,
	formDescription: string,
	formFields: FormField[],
	testRun: boolean,
) => {
	const { formHtml, variables, validationCases } = prepareFormGroups(formFields);
	const form = createForm(formTitle, formDescription, formHtml);
	return `
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<link rel="icon" type="image/png" href="https://n8n.io/favicon.ico" />
			<title>${formTitle}</title>
			<style>${styles}</style>
		</head>

		<body>
			<div class="container">
				<section>
					${testRun ? testNotice : ''}
					${form}
					${submittedTestMessage(testRun)}
					${automatedWith}
				</section>
			</div>
			<script>
			const form = document.querySelector('#n8n-form');
			${variables}

			form.addEventListener('submit', (e) => {
				let valid = true;
				e.preventDefault();

				${validationCases}

				if (valid) {
					var formData = new FormData(form);
					fetch('#', {
						method: 'POST',
						body: formData
					})
						.then(function (response) {
							if (response.status === 200) {
								form.style.display = 'none';
								document.querySelector('#submitted-form').style.display = 'block';
							}
						})
						.catch(function (error) {
							console.error('Error:', error);
						});
				}
			});
		</script>
		</body>
	</html>
	`;
};
