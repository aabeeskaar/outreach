"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Send,
  Sparkles,
  User,
  Mail,
  Building,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface Email {
  id: string;
  subject: string;
  body: string;
  tone: string;
  purpose: string;
  status: "DRAFT" | "SENT" | "FAILED";
  sentAt: string | null;
  createdAt: string;
  gmailThreadId?: string | null;
  recipient: {
    name: string;
    email: string;
    organization: string | null;
  };
}

interface ThreadMessage {
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

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const emailId = params.id as string;

  const [email, setEmail] = useState<Email | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [replyTone, setReplyTone] = useState("professional");

  useEffect(() => {
    if (emailId) {
      fetchEmail();
      fetchThread();
    }
  }, [emailId]);

  const fetchEmail = async () => {
    try {
      const response = await fetch(`/api/emails/${emailId}`);
      if (response.ok) {
        const data = await response.json();
        setEmail(data);
      } else {
        toast.error("Failed to load email");
        router.push("/history");
      }
    } catch (error) {
      console.error("Failed to fetch email:", error);
      toast.error("Failed to load email");
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async () => {
    setThreadLoading(true);
    try {
      const response = await fetch(`/api/emails/${emailId}/thread`);
      if (response.ok) {
        const data = await response.json();
        setThreadMessages(data.thread.messages);
      } else {
        const data = await response.json();
        if (data.error !== "No thread found for this email") {
          toast.error(data.error || "Failed to load conversation");
        }
      }
    } catch (error) {
      console.error("Failed to load thread:", error);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!email) return;

    setGeneratingReply(true);
    try {
      const response = await fetch(`/api/emails/${email.id}/generate-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: replyTone }),
      });

      if (response.ok) {
        const data = await response.json();
        setReplyText(data.reply);
        toast.success("Reply generated!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to generate reply");
      }
    } catch (error) {
      console.error("Generate reply error:", error);
      toast.error("Failed to generate reply");
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleSendReply = async () => {
    if (!email || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const response = await fetch(`/api/emails/${email.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText }),
      });

      if (response.ok) {
        toast.success("Reply sent!");
        setReplyText("");
        fetchThread();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to send reply");
      }
    } catch (error) {
      console.error("Send reply error:", error);
      toast.error("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const parseGmailDate = (dateStr: string) => {
    try {
      return new Date(dateStr);
    } catch {
      return new Date();
    }
  };

  const stripHtml = (html: string) => {
    // First, remove the quoted reply section (Gmail style: "On ... wrote:" followed by quoted content)
    // This pattern matches various Gmail quote formats
    let text = html
      .replace(/(<div class="gmail_quote">[\s\S]*$)/gi, "") // Gmail quote div
      .replace(/(On\s+\w+,\s+\d+\s+\w+\s+\d+\s+at\s+[\d:]+,[\s\S]*wrote:[\s\S]*$)/gi, "") // On Day, DD Mon YYYY at HH:MM, ... wrote:
      .replace(/(On\s+[\d\/\-]+[\s\S]*wrote:[\s\S]*$)/gi, "") // On date ... wrote:
      .replace(/(<blockquote[\s\S]*<\/blockquote>)/gi, ""); // Blockquote tags

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");

    // Convert block elements to newlines
    text = text
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li>/gi, "• ");

    // Remove remaining HTML tags
    text = text.replace(/<[^>]*>/g, "");

    // Clean up whitespace while preserving intentional line breaks
    text = text
      .replace(/[ \t]+/g, " ")  // Multiple spaces to single space
      .replace(/\n /g, "\n")     // Remove space after newline
      .replace(/ \n/g, "\n")     // Remove space before newline
      .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
      .trim();

    return text;
  };

  if (loading) {
    return <ConversationSkeleton />;
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Email not found</p>
        <Button asChild className="mt-4">
          <Link href="/history">Back to History</Link>
        </Button>
      </div>
    );
  }

  const hasReplies = threadMessages.some((m) => !m.isFromMe);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/history">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Conversation</h1>
          <p className="text-muted-foreground">
            Email thread with {email.recipient.name}
          </p>
        </div>
      </div>

      {/* Recipient Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Recipient Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{email.recipient.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Mail className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-sm">{email.recipient.email}</p>
              </div>
            </div>
            {email.recipient.organization && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Building className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="font-medium">{email.recipient.organization}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subject */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <MessageSquare className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subject</p>
              <p className="font-semibold text-lg">{email.subject}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Conversation History
        </h2>

        {threadLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : threadMessages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                No messages in this conversation yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {threadMessages.map((message) => (
              <Card
                key={message.id}
                className={message.isFromMe ? "border-primary/30 bg-primary/5" : ""}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          message.isFromMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {message.isFromMe ? "You" : email.recipient.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {message.isFromMe ? "Sent" : "Received"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {format(parseGmailDate(message.date), "MMM d, yyyy 'at' h:mm a")}
                    </Badge>
                  </div>
                  <div className="pl-13 ml-[52px]">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {stripHtml(message.body)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reply Section */}
      {hasReplies && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Send a Reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={replyTone} onValueChange={setReplyTone}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleGenerateReply}
                disabled={generatingReply}
              >
                {generatingReply ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Reply with AI
              </Button>
            </div>

            <Textarea
              placeholder="Write your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={6}
              className="resize-none"
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSendReply}
                disabled={sendingReply || !replyText.trim()}
                size="lg"
              >
                {sendingReply ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Reply
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No replies message */}
      {!hasReplies && !threadLoading && threadMessages.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Mail className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              No replies received yet. Check back later!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
