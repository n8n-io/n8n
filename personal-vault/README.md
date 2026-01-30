# Personal Vault

A secure, zero-knowledge personal vault for storing sensitive information with end-to-end encryption.

## Features

- **End-to-End Encryption**: All data is encrypted client-side using AES-256-GCM before being sent to the server
- **Zero-Knowledge Architecture**: The server never has access to your plaintext data or encryption keys
- **Strong Key Derivation**: Uses Argon2id for password-based key derivation
- **Secure Authentication**: Double-hashing with JWT and refresh token rotation
- **Multiple Entry Types**:
  - Passwords (with built-in password generator)
  - Secure Notes
  - Credit Cards
  - Identities (passport, ID cards, etc.)
  - Bank Accounts
- **Organization**: Folders for organizing your entries
- **Client-side Search**: Search across all your decrypted data
- **Auto-Lock**: Automatic vault locking after inactivity
- **Password Recovery**: Recovery key for account recovery

## Security Architecture

See [docs/SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md) for detailed security documentation.

### Key Points

1. **Master Password** is never sent to the server
2. **Encryption Key** is derived from master password and stored only in memory
3. **Auth Key** (separate from encryption key) is used for server authentication
4. **Recovery Key** allows account recovery without server knowing your encryption key

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for development/build
- Tailwind CSS for styling
- Zustand for state management
- argon2-browser for client-side key derivation
- Web Crypto API for encryption

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM with SQLite
- Argon2 for password hashing
- JWT for authentication
- Helmet for security headers
- Rate limiting

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Docker & Docker Compose (optional)

### Development Setup

1. **Clone and install dependencies**

```bash
cd personal-vault
npm install
```

2. **Set up the server**

```bash
cd server
cp .env.example .env
# Edit .env with your JWT secrets
npx prisma db push
npm run dev
```

3. **Set up the client**

```bash
cd client
npm run dev
```

4. **Access the app**

Open http://localhost:5173 in your browser.

### Using Docker

```bash
# Development
docker-compose up --build

# Production
cp .env.example .env
# Edit .env with production secrets
docker-compose -f docker-compose.prod.yml up --build -d
```

## Project Structure

```
personal-vault/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand stores
│   │   ├── utils/         # Utilities (crypto, api)
│   │   └── hooks/         # Custom hooks
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Utilities
│   │   └── __tests__/     # Tests
│   └── prisma/            # Database schema
├── shared/                 # Shared types
│   └── types/
├── docs/                   # Documentation
└── docker-compose.yml     # Docker setup
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/salt` - Get salt for key derivation
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

### Vault Entries
- `GET /api/v1/entries` - List entries
- `GET /api/v1/entries/:id` - Get entry
- `POST /api/v1/entries` - Create entry
- `PUT /api/v1/entries/:id` - Update entry
- `DELETE /api/v1/entries/:id` - Delete entry

### Folders
- `GET /api/v1/folders` - List folders
- `POST /api/v1/folders` - Create folder
- `PUT /api/v1/folders/:id` - Update folder
- `DELETE /api/v1/folders/:id` - Delete folder

## Security Considerations

### What's Protected
- All vault entry data is encrypted
- Folder names are encrypted
- Master password never leaves the client
- Server cannot decrypt any user data

### What's NOT Encrypted
- Email addresses (for login)
- Entry types (password, note, etc.)
- Timestamps (for sorting)
- Folder hierarchy structure

### Recommendations
- Use a strong, unique master password (12+ characters)
- Save your recovery key securely (offline)
- Enable HTTPS in production
- Regularly back up your database

## Running Tests

```bash
# Server tests
cd server
npm test

# Client tests
cd client
npm test
```

## Production Deployment

1. Generate strong JWT secrets:
```bash
openssl rand -base64 64
```

2. Configure environment variables in `.env`

3. Set up HTTPS (required for security)

4. Deploy using Docker:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## License

MIT License - See LICENSE file for details.

## Contributing

Contributions are welcome! Please read the security architecture document before contributing to understand the security model.
