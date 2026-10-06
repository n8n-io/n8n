export const placeholder = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My page</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      background: #f6f6f8;
      color: #1f2328;
    }

    main {
      max-width: 28rem;
      padding: 2rem;
      text-align: center;
    }

    h1 {
      margin: 0 0 0.75rem;
      font-size: 1.75rem;
    }

    p {
      margin: 0;
      line-height: 1.5;
      color: #59636e;
    }
  </style>
</head>
<body>
  <main>
    <h1>Hello from n8n</h1>
    <p>Edit the HTML of this node to build your page. Publish the workflow to make it live.</p>
  </main>
</body>
</html>
`.trim();
