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

  return {
    ...connection,
    accessToken: decrypt(connection.accessToken),
    refreshToken: decrypt(connection.refreshToken),
  };
}

export async function refreshAccessToken(userId: string) {
  const connection = await getGmailConnection(userId);
  if (!connection) throw new Error("No Gmail connection found");

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: connection.refreshToken,
  });

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

  throw new Error("Failed to refresh access token");
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
