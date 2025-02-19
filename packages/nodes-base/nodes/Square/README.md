# Square

## Prerequisites

You need a Square developer account to use this node. Here's how to get started:

1. Visit [Square Developer Portal](https://developer.squareup.com/us/en)
2. Click "Sign Up" in the top right corner
3. Fill out the registration form to create your account
4. Verify your email address

## Getting Your API Credentials

1. Log into the [Square Developer Dashboard](https://developer.squareup.com/apps)
2. In the left navigation menu, click "Applications"
3. Create a new application or select an existing one
4. Navigate to the "OAuth" section in the left menu
5. Here you will find your:
   - Application ID
   - Application Secret
   - OAuth Redirect URL

## Using OAuth with Square

To authenticate your application:

1. Use the Application ID and Application Secret in your node configuration
2. Set your OAuth Redirect URL in the Square Developer Dashboard
3. Make sure the redirect URL matches the one configured in your n8n installation

## Important Notes

- Keep your Application Secret secure and never share it
- Square provides both sandbox and production environments
- The sandbox environment is great for testing without affecting real data
- Make sure to use the appropriate credentials based on your environment (sandbox/production)

## References

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Square API Reference](https://developer.squareup.com/reference/square)
