# NoteTaker PWA

Minimal notes app frontend (Vite + React) with a minimal backend API for:

- user authentication
- per-user note storage

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Auth: JWT + bcrypt
- Storage: local JSON file at backend/data/db.json

## Install

pnpm install

## Generate Local HTTPS Certificates (PEM)

The recommended method is `mkcert`. It creates a local Certificate Authority (CA), adds it to your OS/browser trust store, and generates trusted local certificates (no browser warning for localhost).

### Step 1: Install `mkcert`

- macOS:
  - `brew install mkcert`
  - If you use Firefox: `brew install nss`
- Windows (Chocolatey):
  - `choco install mkcert`
- Linux:
  - `sudo apt install libnss3-tools`
  - Download the prebuilt `mkcert` binary from the mkcert GitHub releases page

### Step 2: Create and trust a local CA

Run once on your machine:

`mkcert -install`

### Step 3: Generate certs for localhost

From the project root:

`mkcert localhost`

This creates:

- `localhost.pem` (certificate)
- `localhost-key.pem` (private key)

These files are used by the frontend (`vite.config.ts`) and backend (`backend/server.js`) HTTPS setup.

## Run

- Frontend only:
  pnpm dev

- Backend only:
  pnpm server

- Frontend + backend together:
  pnpm dev:full

Backend runs on https://localhost:4000 by default.

## Environment

Copy .env.example to .env and adjust values as needed:

PORT=4000
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=https://localhost:5173

## API

### Health

GET /api/health

### Auth

POST /api/auth/register
Body:
{
"email": "user@example.com",
"password": "secret123"
}

POST /api/auth/login
Body:
{
"email": "user@example.com",
"password": "secret123"
}

Both auth endpoints return:
{
"token": "<jwt>",
"user": {
"id": "...",
"email": "user@example.com",
"createdAt": "..."
}
}

### Notes (Bearer token required)

GET /api/notes

POST /api/notes
Body:
{
"title": "My note",
"content": "hello"
}

PUT /api/notes/:id
Body (one or both):
{
"title": "Updated title",
"content": "Updated content"
}

DELETE /api/notes/:id

## Data behavior

- Notes are scoped to the authenticated user.
- Data persists locally in backend/data/db.json.
- Deleting backend/data/db.json resets all users and notes.
