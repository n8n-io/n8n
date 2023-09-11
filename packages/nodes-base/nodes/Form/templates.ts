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
margin: 2em 1em;
font-weight: 400;
font-size: 1.2em;
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
margin-top: 2em;
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
margin: 2em 1em;
padding: 0 1em;
font-weight: 700;
font-size: 1.3em;
border-radius: .75em;
border: 0.1em solid #ebb360;
text-align: left;
}

.test-notice p {
margin: 1.5em 0.5em;
font-weight: 500;
opacity: 0.8;
}

form {
margin: 1em;
padding: 0.5em 1em;
background-color: white;
border: 0.1em solid lightgray;
border-radius: 0.5em;
box-shadow: 0 0.3em 1em rgba(0, 0, 0, 0.1);
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

export const createFormPage = (formTitle: string, formDescription: string, testRun: boolean) => {
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

	<form action='#' method='POST' name='n8n-form' id='n8n-form'>
		<div class="form-header">
			<h1>${formTitle}</h1>
			<p>
				${formDescription}
			</p>
		</div>

		<div class="item">
			<div class="form-group">
				<label class="form-label" for="form-title-1">Form Title 1</label>
				<input type="text" class="form-input" id="form-title-1" name="form-title-1">
				<p class="error-form-title-1 error-hidden">
					First Name cannot be empty
				</p>
			</div>

			<div class="form-group">
				<label class="form-label" for="form-title-2">Form Title 2</label>
				<input type="text" class="form-input" id="form-title-2" name="form-title-2">
				<p class="error-form-title-2 error-hidden">
					First Name cannot be empty
				</p>
			</div>

			<div class="form-group">
				<label class="form-label" for="form-title-3">Form Title 3</label>
				<select class="form-input" id="form-title-3" name="form-title-3">
					<option value="" disabled selected>Select an option</option>
					<option value="Option 1">Option 1</option>
					<option value="Option 2">Option 2</option>
				</select>
				<p class="error-form-title-3 error-hidden">
					First Name cannot be empty
				</p>
			</div>
		</div>

		<button id="submit-btn" type="submit">Submit form</button>

	</form>
	<div class="n8n-link">
		<p>
			Form automated with <img src="https://n8n.io/favicon.ico" alt="n8n logo"> <strong>n8n</strong>
		</p>
	</div>
	</section>
	</div>
	</body>

	</html>
	`;
};
