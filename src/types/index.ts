import {
  User,
  Profile,
  Document,
  GmailConnection,
  Recipient,
  GeneratedEmail,
  DocumentType,
  EmailTone,
  EmailPurpose,
  EmailStatus,
} from "@prisma/client";

export type {
  User,
  Profile,
  Document,
  GmailConnection,
  Recipient,
  GeneratedEmail,
};

export { DocumentType, EmailTone, EmailPurpose, EmailStatus };

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: string;
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface ProfileWithUser extends Profile {
  user: User;
}

export interface DocumentWithUser extends Document {
  user: User;
}

export interface RecipientWithEmails extends Recipient {
  generatedEmails: GeneratedEmail[];
}

export interface GeneratedEmailWithRecipient extends GeneratedEmail {
  recipient: Recipient;
}

export interface UserWithProfile extends User {
  profile: Profile | null;
}

export interface EmailGenerationRequest {
  recipientId: string;
  purpose: EmailPurpose;
  tone: EmailTone;
  additionalContext?: string;
  selectedDocumentIds?: string[];
}

export interface EmailGenerationResponse {
  subject: string;
  body: string;
}

export interface GmailSendRequest {
  to: string;
  subject: string;
  body: string;
  attachments?: {
    filename: string;
    content: string;
    mimeType: string;
  }[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
