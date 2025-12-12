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
  AlertTriangle,
  Bot,
  Eye,
  MousePointerClick,
  Edit2,
  X,
  Save,
  RefreshCw,
  Paperclip,
  FileText,
  Trash2,
  Forward,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface TrackingStats {
  emailId: string;
  trackingId: string | null;
  isPro: boolean;
  opens: {
    total: number;
    unique: number;
  };
  clicks: {
    total: number;
    unique: number;
  };
}

interface AttachmentFile {
  file: File;
  name: string;
  size: number;
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
  const [aiProvider, setAiProvider] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [trackingStats, setTrackingStats] = useState<TrackingStats | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);

  useEffect(() => {
    fetchDefaultAiProvider();
  }, []);

  useEffect(() => {
    if (emailId) {
      fetchEmail();
      fetchThread();
      fetchTrackingStats();
      markConversationAsRead();
    }
  }, [emailId]);

  const fetchDefaultAiProvider = async () => {
    try {
      const response = await fetch("/api/settings/ai");
      if (response.ok) {
        const data = await response.json();
        setAiProvider(data.defaultProvider || "gemini");
      } else {
        setAiProvider("gemini");
      }
    } catch {
      setAiProvider("gemini");
    }
  };

  const markConversationAsRead = async () => {
    try {
      await fetch(`/api/emails/${emailId}/read`, { method: "POST" });
    } catch (error) {
      // Silent fail - not critical
    }
  };

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

  const fetchTrackingStats = async () => {
    setTrackingLoading(true);
    try {
      const response = await fetch(`/api/emails/${emailId}/tracking`);
      if (response.ok) {
        const data = await response.json();
        setTrackingStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch tracking stats:", error);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleRefreshConversation = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchThread(), fetchTrackingStats()]);
      toast.success("Conversation refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenEditDialog = () => {
    if (email) {
      setEditSubject(email.subject);
      setEditBody(email.body);
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!email || email.status !== "DRAFT") return;

    setSaving(true);
    try {
      const response = await fetch(`/api/emails/${email.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: editSubject,
          body: editBody
        }),
      });

      if (response.ok) {
        const updatedEmail = await response.json();
        setEmail(updatedEmail);
        setEditDialogOpen(false);
        toast.success("Draft saved successfully");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save draft");
      }
    } catch (error) {
      console.error("Save draft error:", error);
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 5 * 1024 * 1024; // 5MB limit
    const newAttachments: AttachmentFile[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max size is 5MB`);
        return;
      }
      if (attachments.length + newAttachments.length >= 3) {
        toast.error("Maximum 3 attachments allowed");
        return;
      }
      newAttachments.push({
        file,
        name: file.name,
        size: file.size,
      });
    });

    setAttachments([...attachments, ...newAttachments]);
    e.target.value = ""; // Reset input
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleGenerateReply = async () => {
    if (!email) return;

    setGeneratingReply(true);
    setAiError(null);
    try {
      const response = await fetch(`/api/emails/${email.id}/generate-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: replyTone, provider: aiProvider }),
      });

      if (response.ok) {
        const data = await response.json();
        setReplyText(data.reply);
        toast.success("Reply generated!");
      } else {
        const data = await response.json();
        const errorMsg = data.error || "Failed to generate reply";

        // Check if it's a rate limit error
        if (errorMsg.includes("rate limit") || errorMsg.includes("quota") || errorMsg.includes("429")) {
          setAiError(`${aiProvider === "gemini" ? "Gemini" : "Groq"} rate limit exceeded. Try switching to ${aiProvider === "gemini" ? "Groq" : "Gemini"}.`);
        } else if (errorMsg.includes("not configured")) {
          setAiError(`${aiProvider === "gemini" ? "Gemini" : "Groq"} is not configured. Try switching to ${aiProvider === "gemini" ? "Groq" : "Gemini"}.`);
        } else {
          setAiError(errorMsg);
        }
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Generate reply error:", error);
      setAiError("Failed to connect to AI service. Please try again.");
      toast.error("Failed to generate reply");
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleSendReply = async () => {
    if (!email || !replyText.trim()) return;

    setSendingReply(true);
    try {
      let response;

      // If there are attachments, use FormData
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append("body", replyText);
        attachments.forEach((att) => {
          formData.append("attachments", att.file);
        });

        response = await fetch(`/api/emails/${email.id}/reply`, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(`/api/emails/${email.id}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: replyText }),
        });
      }

      if (response.ok) {
        toast.success("Reply sent!");
        setReplyText("");
        setAttachments([]);
        // Refresh conversation after a short delay to allow Gmail to process
        setTimeout(() => {
          handleRefreshConversation();
        }, 1500);
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

  const handleGenerateFollowUp = async () => {
    if (!email) return;

    setGeneratingFollowUp(true);
    setAiError(null);
    try {
      const response = await fetch(`/api/emails/${email.id}/generate-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: replyTone,
          provider: aiProvider,
          isFollowUp: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFollowUpText(data.reply);
      } else {
        const data = await response.json();
        if (data.error?.includes("API") || data.error?.includes("key") || data.error?.includes("quota")) {
          setAiError(`${aiProvider} unavailable. Try switching provider.`);
        } else {
          toast.error(data.error || "Failed to generate follow-up");
        }
      }
    } catch (error) {
      console.error("Generate follow-up error:", error);
      toast.error("Failed to generate follow-up");
    } finally {
      setGeneratingFollowUp(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!email || !followUpText.trim()) return;

    setSendingFollowUp(true);
    try {
      const response = await fetch(`/api/emails/${email.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: followUpText }),
      });

      if (response.ok) {
        toast.success("Follow-up sent!");
        setFollowUpText("");
        setTimeout(() => {
          handleRefreshConversation();
        }, 1500);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to send follow-up");
      }
    } catch (error) {
      console.error("Send follow-up error:", error);
      toast.error("Failed to send follow-up");
    } finally {
      setSendingFollowUp(false);
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
        <div className="flex items-center gap-2">
          {email.status === "DRAFT" && (
            <Button variant="outline" size="sm" onClick={handleOpenEditDialog}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Draft
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefreshConversation}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
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
                {/* AI Error Alert */}
                {aiError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>{aiError}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAiProvider(aiProvider === "gemini" ? "groq" : "gemini");
                          setAiError(null);
                        }}
                        className="ml-2"
                      >
                        Switch to {aiProvider === "gemini" ? "Groq" : "Gemini"}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {/* AI Provider Selector */}
                  <Select value={aiProvider} onValueChange={(value) => { setAiProvider(value); setAiError(null); }}>
                    <SelectTrigger className="w-32">
                      <Bot className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="AI Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Gemini</SelectItem>
                      <SelectItem value="groq">Groq</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Tone Selector */}
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
                    className="resize-none"
                  />
                </div>

                {/* Attachments Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="attachment-input"
                      className="cursor-pointer inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Paperclip className="h-4 w-4" />
                      Add attachments ({attachments.length}/3)
                    </Label>
                    <input
                      id="attachment-input"
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
                    />
                  </div>

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="max-w-[150px] truncate">{att.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({formatFileSize(att.size)})
                          </span>
                          <button
                            onClick={() => handleRemoveAttachment(index)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                  >
                    {sendingReply ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Reply
                    {attachments.length > 0 && ` (${attachments.length} attachment${attachments.length > 1 ? "s" : ""})`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up Section - when no reply from recipient */}
          {!hasReplies && !threadLoading && threadMessages.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Forward className="h-4 w-4" />
                  Send a Follow-up
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  No response yet from {email.recipient.name}. Send a follow-up to get their attention.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Error Alert */}
                {aiError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>{aiError}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAiProvider(aiProvider === "gemini" ? "groq" : "gemini");
                          setAiError(null);
                        }}
                        className="ml-2"
                      >
                        Switch to {aiProvider === "gemini" ? "Groq" : "Gemini"}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {/* AI Provider Selector */}
                  <Select value={aiProvider} onValueChange={(value) => { setAiProvider(value); setAiError(null); }}>
                    <SelectTrigger className="w-32">
                      <Bot className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="AI Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Gemini</SelectItem>
                      <SelectItem value="groq">Groq</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Tone Selector */}
                  <Select value={replyTone} onValueChange={setReplyTone}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateFollowUp}
                    disabled={generatingFollowUp}
                  >
                    {generatingFollowUp ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate Follow-up
                  </Button>
                </div>

                <div className="relative">
                  <Textarea
                    placeholder="Type your follow-up message here..."
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSendFollowUp}
                    disabled={sendingFollowUp || !followUpText.trim()}
                  >
                    {sendingFollowUp ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Follow-up
                  </Button>
                </div>
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

          {/* Tracking Stats Card */}
          {email.status === "SENT" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Email Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {trackingLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : trackingStats ? (
                  <>
                    {/* Opens Stats */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Opens</span>
                          <span className="text-lg font-semibold">{trackingStats.opens.total}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {trackingStats.opens.unique} unique
                        </p>
                      </div>
                    </div>

                    {/* Clicks Stats */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <MousePointerClick className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Link Clicks</span>
                          <span className="text-lg font-semibold">{trackingStats.clicks.total}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {trackingStats.clicks.unique} unique
                        </p>
                      </div>
                    </div>

                    {!trackingStats.trackingId && (
                      <p className="text-xs text-muted-foreground text-center">
                        Tracking not enabled for this email
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Unable to load tracking stats
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Draft Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Draft Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-body">Body</Label>
              <Textarea
                id="edit-body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Email body"
                rows={12}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
