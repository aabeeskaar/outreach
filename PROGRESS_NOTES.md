# OutreachAI - Development Progress Notes

## Current Work: Conversation Detail Page (`/conversation/[id]`)

### Completed Today (Dec 11, 2025)

#### 1. Database Schema Fix
- Pushed new fields (`gmailMessageId`, `gmailThreadId`) to Neon database
- Fixed 500 Internal Server Error on `/api/emails`

#### 2. Conversation Page - New Dedicated Page
- **Location:** `src/app/(dashboard)/conversation/[id]/page.tsx`
- Moved from popup dialog to full page
- Modern chat-style UI with:
  - User avatars (profile picture for you, initials for recipient)
  - Chat bubbles (your messages on right, recipient on left)
  - Timestamps and "Sent" status indicators
  - 3-column layout (messages + sidebar with details)

#### 3. Email Body Formatting
- Fixed HTML stripping to show proper line breaks
- Removed quoted reply text ("On ... wrote:")
- Decode HTML entities properly

#### 4. AI Reply Generation
- Added AI provider selector (Gemini / Groq)
- Shows error alert when rate limit exceeded
- "Switch to Groq/Gemini" button for easy switching
- Removed Gmail dependency - works with database only

#### 5. Email Reply Threading Fix
- Fixed replies going to separate email threads
- Now uses proper RFC822 Message-ID headers
- `In-Reply-To` and `References` headers for proper threading

#### 6. Gmail Token Handling
- Better error handling for expired tokens
- Auto-delete corrupted connections
- Improved encryption/decryption error handling

---

### Files Modified

1. `src/app/(dashboard)/conversation/[id]/page.tsx` - Main conversation page
2. `src/app/(dashboard)/history/page.tsx` - Updated links to conversation page
3. `src/app/api/emails/[id]/generate-reply/route.ts` - AI reply generation
4. `src/app/api/emails/[id]/reply/route.ts` - Send reply endpoint
5. `src/lib/gmail.ts` - Gmail functions, reply threading fix
6. `src/lib/encryption.ts` - Better error handling
7. `prisma/schema.prisma` - Database schema

---

### Pending / Known Issues

1. **Gmail Connection** - Users may need to reconnect if token expired
2. **AI Rate Limits** - Gemini free tier has daily limits, recommend adding Groq as backup
3. **Environment Variables Needed:**
   - `GOOGLE_GEMINI_API_KEY` - For Gemini AI
   - `GROQ_API_KEY` - For Groq AI (backup)
   - `ENCRYPTION_KEY` - For token encryption (must stay consistent)

---

### Next Steps / Ideas

- [ ] Add loading skeleton while messages load
- [ ] Show email open/click tracking stats in conversation
- [ ] Allow editing drafts from conversation page
- [ ] Add attachment support for replies
- [ ] Refresh conversation after sending reply

---

## Quick Commands

```bash
# Run locally
npm run dev

# Build
npm run build

# Push database changes
npx prisma db push

# Generate Prisma client
npx prisma generate
```

---

Last Updated: Dec 11, 2025
