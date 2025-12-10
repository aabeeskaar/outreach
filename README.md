# OutreachAI

AI-powered email outreach automation platform built with Next.js, TypeScript, and the Claude API.

## Features

- **Authentication**: Google OAuth and email/password login via NextAuth.js
- **Profile Management**: Create detailed professional profiles with education, experience, skills, and goals
- **Document Management**: Upload and store CVs, transcripts, cover letters with automatic text extraction
- **Gmail Integration**: Connect Gmail via OAuth 2.0 for sending emails directly from the platform
- **Recipient Management**: Store and manage outreach recipients with organization and role details
- **AI Email Generation**: Generate personalized emails using Anthropic's Claude API based on your profile, documents, and recipient information
- **Email Composer**: Rich editor with preview, tone adjustment, and attachment support
- **Email History**: Track all generated and sent emails with status filtering

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui with Radix primitives
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (Google OAuth + Credentials)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Email**: Gmail API via OAuth 2.0

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Cloud Console project (for OAuth and Gmail API)
- Anthropic API key

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/outreachai"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Gmail OAuth (separate credentials for Gmail API)
GMAIL_CLIENT_ID="your-gmail-client-id"
GMAIL_CLIENT_SECRET="your-gmail-client-secret"
GMAIL_REDIRECT_URI="http://localhost:3000/api/gmail/callback"

# Anthropic
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Encryption key for storing OAuth tokens
ENCRYPTION_KEY="32-character-encryption-key-here"
```

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API
4. Configure the OAuth consent screen:
   - Add scopes: `email`, `profile`, `gmail.send`, `gmail.readonly`
5. Create OAuth 2.0 credentials:
   - For NextAuth: Add `http://localhost:3000/api/auth/callback/google` as authorized redirect URI
   - For Gmail: Add `http://localhost:3000/api/gmail/callback` as authorized redirect URI

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd outreachai
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run db:generate
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth pages (login, signup)
│   ├── (dashboard)/      # Protected dashboard pages
│   │   ├── compose/      # Email composer
│   │   ├── dashboard/    # Main dashboard
│   │   ├── documents/    # Document management
│   │   ├── history/      # Email history
│   │   ├── profile/      # Profile editor
│   │   ├── recipients/   # Recipient management
│   │   └── settings/     # Settings page
│   └── api/              # API routes
├── components/
│   ├── layouts/          # Layout components (Sidebar, Header)
│   ├── providers/        # Context providers
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── ai.ts             # Claude API integration
│   ├── auth.ts           # NextAuth configuration
│   ├── gmail.ts          # Gmail API integration
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Utility functions
└── types/
    └── next-auth.d.ts    # Type declarations
```

## API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `GET/POST /api/auth/[...nextauth]` - NextAuth handlers

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Documents
- `GET /api/documents` - List user documents
- `POST /api/documents` - Upload document
- `GET /api/documents/[id]` - Get document details
- `DELETE /api/documents/[id]` - Delete document
- `POST /api/documents/[id]/extract` - Extract text from document
- `GET /api/documents/[id]/download` - Download document

### Gmail
- `GET /api/gmail/connect` - Get Gmail OAuth URL
- `GET /api/gmail/callback` - OAuth callback
- `POST /api/gmail/disconnect` - Disconnect Gmail
- `GET /api/gmail/status` - Check connection status

### Recipients
- `GET /api/recipients` - List recipients
- `POST /api/recipients` - Create recipient
- `PUT /api/recipients/[id]` - Update recipient
- `DELETE /api/recipients/[id]` - Delete recipient

### Emails
- `POST /api/emails/generate` - Generate email with AI
- `GET /api/emails` - List generated emails
- `POST /api/emails` - Save email draft
- `GET /api/emails/[id]` - Get email details
- `PUT /api/emails/[id]` - Update email
- `DELETE /api/emails/[id]` - Delete email
- `POST /api/emails/[id]/send` - Send email via Gmail

## License

MIT
