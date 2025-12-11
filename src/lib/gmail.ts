import { google } from "googleapis";
import { encrypt, decrypt } from "./encryption";
import prisma from "./prisma";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/gmail/callback`
  );
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent",
  });
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function saveGmailConnection(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
  email: string
) {
  const encryptedAccessToken = encrypt(accessToken);
  const encryptedRefreshToken = encrypt(refreshToken);

  return prisma.gmailConnection.upsert({
    where: { userId },
    update: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      connectedEmail: email,
    },
    create: {
      userId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      connectedEmail: email,
    },
  });
}

export async function getGmailConnection(userId: string) {
  const connection = await prisma.gmailConnection.findUnique({
    where: { userId },
  });

  if (!connection) return null;

  try {
    return {
      ...connection,
      accessToken: decrypt(connection.accessToken),
      refreshToken: decrypt(connection.refreshToken),
    };
  } catch (error) {
    console.error("Failed to decrypt Gmail tokens:", error);
    // Delete the corrupted connection
    try {
      await prisma.gmailConnection.delete({ where: { userId } });
      console.log("Deleted corrupted Gmail connection for user:", userId);
    } catch (deleteError) {
      console.error("Failed to delete corrupted connection:", deleteError);
    }
    return null;
  }
}

export async function refreshAccessToken(userId: string) {
  const connection = await getGmailConnection(userId);
  if (!connection) throw new Error("No Gmail connection found");

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: connection.refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (credentials.access_token) {
      const newExpiresAt = new Date(credentials.expiry_date || Date.now() + 3600 * 1000);

      await saveGmailConnection(
        userId,
        credentials.access_token,
        connection.refreshToken,
        newExpiresAt,
        connection.connectedEmail
      );

      return credentials.access_token;
    }

    throw new Error("Failed to refresh access token - no access token returned");
  } catch (error) {
    console.error("Gmail token refresh error:", error);
    // Delete the invalid connection so user can reconnect
    try {
      await prisma.gmailConnection.delete({ where: { userId } });
    } catch (deleteError) {
      console.error("Failed to delete invalid Gmail connection:", deleteError);
    }
    throw new Error("Gmail session expired. Please reconnect Gmail in settings.");
  }
}

export async function getGmailClient(userId: string) {
  let connection = await getGmailConnection(userId);
  if (!connection) throw new Error("No Gmail connection found");

  // Check if token is expired or will expire in next 5 minutes
  const now = new Date();
  const expiresAt = new Date(connection.expiresAt);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt < fiveMinutesFromNow) {
    await refreshAccessToken(userId);
    connection = await getGmailConnection(userId);
    if (!connection) throw new Error("Failed to refresh Gmail connection");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  attachments?: Array<{
    filename: string;
    content: Buffer;
    mimeType: string;
  }>
) {
  const gmail = await getGmailClient(userId);
  const connection = await getGmailConnection(userId);
  if (!connection) throw new Error("No Gmail connection found");

  let email = "";
  const boundary = `boundary_${Date.now()}`;

  if (attachments && attachments.length > 0) {
    email = [
      `From: ${connection.connectedEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      "",
      body,
    ].join("\r\n");

    for (const attachment of attachments) {
      email += [
        "",
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        `Content-Transfer-Encoding: base64`,
        "",
        attachment.content.toString("base64"),
      ].join("\r\n");
    }

    email += `\r\n--${boundary}--`;
  } else {
    email = [
      `From: ${connection.connectedEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset="UTF-8"`,
      "",
      body,
    ].join("\r\n");
  }

  const encodedEmail = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedEmail,
    },
  });

  return response.data;
}

export async function disconnectGmail(userId: string) {
  return prisma.gmailConnection.delete({
    where: { userId },
  });
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  to: string;
  from: string;
  snippet: string;
  body: string;
  date: string;
}

export async function getSentEmails(
  userId: string,
  maxResults: number = 20,
  pageToken?: string
): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
  const gmail = await getGmailClient(userId);

  // Get list of sent messages
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    labelIds: ["SENT"],
    maxResults,
    pageToken,
  });

  const messages = listResponse.data.messages || [];
  const nextPageToken = listResponse.data.nextPageToken || undefined;

  // Fetch full details for each message
  const fullMessages: GmailMessage[] = await Promise.all(
    messages.map(async (msg) => {
      const fullMsg = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const headers = fullMsg.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

      // Extract body
      let body = "";
      const payload = fullMsg.data.payload;

      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, "base64").toString("utf-8");
      } else if (payload?.parts) {
        const textPart = payload.parts.find(
          (p) => p.mimeType === "text/plain" || p.mimeType === "text/html"
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
        }
      }

      return {
        id: msg.id!,
        threadId: msg.threadId!,
        subject: getHeader("Subject"),
        to: getHeader("To"),
        from: getHeader("From"),
        snippet: fullMsg.data.snippet || "",
        body,
        date: getHeader("Date"),
      };
    })
  );

  return { messages: fullMessages, nextPageToken };
}

// Helper function to extract body from Gmail message parts
function extractBody(payload: { body?: { data?: string }; parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: Array<{ mimeType?: string; body?: { data?: string } }> }> }): string {
  if (payload?.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  if (payload?.parts) {
    // Look for text/html first, then text/plain
    for (const mimeType of ["text/html", "text/plain"]) {
      const part = payload.parts.find((p) => p.mimeType === mimeType);
      if (part?.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
      // Check nested parts (multipart/alternative)
      if (part?.parts) {
        const nestedPart = part.parts.find((p) => p.mimeType === mimeType);
        if (nestedPart?.body?.data) {
          return Buffer.from(nestedPart.body.data, "base64").toString("utf-8");
        }
      }
    }
    // Fallback: try first part with data
    for (const part of payload.parts) {
      if (part?.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }
  }

  return "";
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  body: string;
  date: string;
  isFromMe: boolean;
}

// Get all messages in a thread (for viewing conversation/replies)
export async function getThreadMessages(
  userId: string,
  threadId: string
): Promise<ThreadMessage[]> {
  const gmail = await getGmailClient(userId);
  const connection = await getGmailConnection(userId);
  if (!connection) throw new Error("No Gmail connection found");

  const thread = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  const messages = thread.data.messages || [];
  const userEmail = connection.connectedEmail.toLowerCase();

  return messages.map((msg) => {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    const from = getHeader("From");
    const isFromMe = from.toLowerCase().includes(userEmail);

    return {
      id: msg.id!,
      threadId: msg.threadId!,
      subject: getHeader("Subject"),
      from,
      to: getHeader("To"),
      snippet: msg.snippet || "",
      body: extractBody(msg.payload as Parameters<typeof extractBody>[0]),
      date: getHeader("Date"),
      isFromMe,
    };
  });
}

// Check if a thread has replies (messages not from the user)
export async function getThreadReplyCount(
  userId: string,
  threadId: string
): Promise<{ total: number; replies: number }> {
  const messages = await getThreadMessages(userId, threadId);
  const replies = messages.filter((m) => !m.isFromMe).length;
  return { total: messages.length, replies };
}

// Send a reply to an email thread
export async function sendReply(
  userId: string,
  threadId: string,
  messageId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; threadId: string }> {
  const gmail = await getGmailClient(userId);
  const connection = await getGmailConnection(userId);
  if (!connection) throw new Error("No Gmail connection found");

  // Ensure subject has Re: prefix
  const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

  const email = [
    `From: ${connection.connectedEmail}`,
    `To: ${to}`,
    `Subject: ${replySubject}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    "",
    body,
  ].join("\r\n");

  const encodedEmail = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedEmail,
      threadId,
    },
  });

  return {
    id: response.data.id!,
    threadId: response.data.threadId!,
  };
}
