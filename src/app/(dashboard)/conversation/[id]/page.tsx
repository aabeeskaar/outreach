"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Mail,
  Building,
  Clock,
  CheckCheck,
  Reply,
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
  const { data: session } = useSession();
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
    let text = html
      .replace(/(<div class="gmail_quote">[\s\S]*$)/gi, "")
      .replace(/(On\s+\w+,\s+\d+\s+\w+\s+\d+\s+at\s+[\d:]+,[\s\S]*wrote:[\s\S]*$)/gi, "")
      .replace(/(On\s+[\d\/\-]+[\s\S]*wrote:[\s\S]*$)/gi, "")
      .replace(/(<blockquote[\s\S]*<\/blockquote>)/gi, "");

    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");

    text = text
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li>/gi, "• ");

    text = text.replace(/<[^>]*>/g, "");

    text = text
      .replace(/[ \t]+/g, " ")
      .replace(/\n /g, "\n")
      .replace(/ \n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return text;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
  const userName = session?.user?.name || "You";
  const userImage = session?.user?.image;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/history">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">{email.subject}</h1>
          <p className="text-sm text-muted-foreground">
            Conversation with {email.recipient.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Conversation Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Messages Container */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/50 border-b py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Messages</CardTitle>
                <Badge variant="secondary" className="font-normal">
                  {threadMessages.length} message{threadMessages.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {threadLoading ? (
                <div className="p-6 space-y-6">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-20 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : threadMessages.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">
                    No messages in this conversation yet
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {threadMessages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${message.isFromMe ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 shrink-0 border-2 border-background shadow-sm">
                        {message.isFromMe ? (
                          <>
                            <AvatarImage src={userImage || undefined} alt={userName} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                              {getInitials(userName)}
                            </AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-500 text-white text-sm font-medium">
                            {getInitials(email.recipient.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      {/* Message Content */}
                      <div className={`flex-1 max-w-[80%] ${message.isFromMe ? "items-end" : ""}`}>
                        {/* Sender Info */}
                        <div className={`flex items-center gap-2 mb-1.5 ${message.isFromMe ? "justify-end" : ""}`}>
                          <span className="font-medium text-sm">
                            {message.isFromMe ? userName : email.recipient.name}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseGmailDate(message.date), "MMM d, h:mm a")}
                          </span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.isFromMe
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted rounded-tl-sm"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {stripHtml(message.body)}
                          </p>
                        </div>

                        {/* Message Status */}
                        {message.isFromMe && (
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <CheckCheck className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs text-muted-foreground">Sent</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reply Section */}
          {hasReplies && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Reply className="h-4 w-4" />
                  Write a Reply
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={replyTone} onValueChange={setReplyTone}>
                    <SelectTrigger className="w-40">
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
                    size="sm"
                    onClick={handleGenerateReply}
                    disabled={generatingReply}
                  >
                    {generatingReply ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate with AI
                  </Button>
                </div>

                <div className="relative">
                  <Textarea
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={5}
                    className="resize-none pr-24"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    size="sm"
                    className="absolute bottom-3 right-3"
                  >
                    {sendingReply ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Waiting for reply message */}
          {!hasReplies && !threadLoading && threadMessages.length > 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium">Waiting for reply</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You&apos;ll be able to respond once {email.recipient.name} replies
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Recipient Info */}
        <div className="space-y-4">
          {/* Recipient Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Recipient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border-2 border-background shadow">
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-500 text-white text-lg font-semibold">
                    {getInitials(email.recipient.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{email.recipient.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {email.recipient.email}
                  </p>
                </div>
              </div>

              {email.recipient.organization && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                  <Building className="h-4 w-4 shrink-0" />
                  <span className="truncate">{email.recipient.organization}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Your Profile Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">You</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border-2 border-background shadow">
                  <AvatarImage src={userImage || undefined} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{userName}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Email Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={email.status === "SENT" ? "default" : "secondary"}>
                  {email.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tone</span>
                <span className="capitalize">{email.tone.toLowerCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(email.createdAt), "MMM d, yyyy")}</span>
              </div>
              {email.sentAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent</span>
                  <span>{format(new Date(email.sentAt), "MMM d, yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="bg-muted/50 border-b py-4">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1 max-w-[80%]">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
