"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Mail,
  Search,
  MoreVertical,
  Eye,
  Send,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  History,
  MousePointerClick,
  MailOpen,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Bell,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface ReplyStats {
  total: number;
  fromMe: number;
  fromRecipient: number;
}

interface Email {
  id: string;
  subject: string;
  body: string;
  tone: string;
  purpose: string;
  status: "DRAFT" | "SENT" | "FAILED";
  sentAt: string | null;
  createdAt: string;
  openCount?: number;
  clickCount?: number;
  gmailThreadId?: string | null;
  replyStats?: ReplyStats;
  conversationRead?: boolean;
  recipient: {
    name: string;
    email: string;
    organization: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusConfig = {
  DRAFT: { icon: Clock, color: "secondary", label: "Draft" },
  SENT: { icon: CheckCircle2, color: "default", label: "Sent" },
  FAILED: { icon: AlertCircle, color: "destructive", label: "Failed" },
};

const purposeLabels: Record<string, string> = {
  JOB_APPLICATION: "Job Application",
  RESEARCH_INQUIRY: "Research Inquiry",
  COLLABORATION: "Collaboration",
  MENTORSHIP: "Mentorship",
  NETWORKING: "Networking",
  OTHER: "Other",
};

export default function HistoryPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchEmails();
  }, [statusFilter]);

  const fetchEmails = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/emails?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
      toast.error("Failed to load emails");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (emailId: string) => {
    setSending(emailId);
    try {
      const response = await fetch(`/api/emails/${emailId}/send`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Email sent successfully!");
        fetchEmails();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send email");
    } finally {
      setSending(null);
    }
  };

  const handleDelete = async (emailId: string) => {
    if (!confirm("Are you sure you want to delete this email?")) return;

    setDeleting(emailId);
    try {
      const response = await fetch(`/api/emails/${emailId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEmails(emails.filter((e) => e.id !== emailId));
        toast.success("Email deleted");
      } else {
        toast.error("Failed to delete email");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete email");
    } finally {
      setDeleting(null);
    }
  };

  const filteredEmails = emails.filter(
    (email) =>
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.recipient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.recipient.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && emails.length === 0) {
    return <HistorySkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">All Emails</h2>
          <p className="text-muted-foreground">
            View and manage your generated emails
          </p>
        </div>
        <Button asChild>
          <Link href="/compose">Compose New Email</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Drafts</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fetchEmails()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
          <Mail className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{pagination?.total || 0}</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">{emails.filter((e) => e.status === "SENT").length}</span>
          <span className="text-xs text-muted-foreground">Sent</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
          <Clock className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">{emails.filter((e) => e.status === "DRAFT").length}</span>
          <span className="text-xs text-muted-foreground">Drafts</span>
        </div>
      </div>

      {/* Email List */}
      <Card className="py-1 gap-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-medium">All Emails</CardTitle>
          {pagination && pagination.total > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => fetchEmails(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => fetchEmails(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No emails yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start by composing your first email
              </p>
              <Button asChild className="mt-4">
                <Link href="/compose">Compose Email</Link>
              </Button>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No emails match your search
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Replies</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.map((email) => {
                  const status = statusConfig[email.status];
                  const StatusIcon = status.icon;
                  const hasUnreadReplies = email.replyStats && email.replyStats.fromRecipient > 0 && !email.conversationRead;
                  return (
                    <TableRow key={email.id} className={hasUnreadReplies ? "bg-primary/5" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{email.recipient.name}</p>
                              {hasUnreadReplies && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {email.recipient.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {email.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {purposeLabels[email.purpose] || email.purpose}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.color as "default" | "secondary" | "destructive"}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {email.status === "SENT" ? (
                          <div className="flex items-center gap-1">
                            <div className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400" title="Email Opens">
                              <MailOpen className="h-3.5 w-3.5" />
                              <span className="text-xs font-semibold ml-1">{email.openCount || 0}</span>
                            </div>
                            <div className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400" title="Link Clicks">
                              <MousePointerClick className="h-3.5 w-3.5" />
                              <span className="text-xs font-semibold ml-1">{email.clickCount || 0}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {email.status === "SENT" && email.replyStats && email.replyStats.total > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{email.replyStats.total}</span>
                            <div className="flex flex-col text-sm leading-tight">
                              {email.replyStats.fromMe > 0 && (
                                <span className="text-purple-500" title={`${email.replyStats.fromMe} sent by you`}>➡</span>
                              )}
                              {email.replyStats.fromRecipient > 0 && (
                                <span className="text-emerald-500" title={`${email.replyStats.fromRecipient} from recipient`}>⬅</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(
                          new Date(email.sentAt || email.createdAt),
                          "MMM d, yyyy"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setSelectedEmail(email)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {email.status === "SENT" && email.gmailThreadId && (
                              <DropdownMenuItem asChild>
                                <Link href={`/conversation/${email.id}`}>
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  View Conversation
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {email.status !== "SENT" && (
                              <DropdownMenuItem
                                onClick={() => handleResend(email.id)}
                                disabled={sending === email.id}
                              >
                                {sending === email.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="mr-2 h-4 w-4" />
                                )}
                                Send
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(email.id)}
                              disabled={deleting === email.id}
                              className="text-destructive focus:text-destructive"
                            >
                              {deleting === email.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Email Detail Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>
              {selectedEmail?.status === "SENT" && selectedEmail.sentAt
                ? `Sent on ${format(new Date(selectedEmail.sentAt), "MMM d, yyyy 'at' h:mm a")}`
                : selectedEmail?.createdAt
                ? `Created on ${format(new Date(selectedEmail.createdAt), "MMM d, yyyy 'at' h:mm a")}`
                : "Date not available"}
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    statusConfig[selectedEmail.status].color as
                      | "default"
                      | "secondary"
                      | "destructive"
                  }
                >
                  {statusConfig[selectedEmail.status].label}
                </Badge>
                <Badge variant="outline">
                  {purposeLabels[selectedEmail.purpose]}
                </Badge>
                <Badge variant="outline">{selectedEmail.tone}</Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">To: </span>
                  <span className="font-medium">{selectedEmail.recipient.name}</span>
                  {" <"}
                  {selectedEmail.recipient.email}
                  {">"}
                </p>
                {selectedEmail.recipient.organization && (
                  <p className="text-sm text-muted-foreground">
                    {selectedEmail.recipient.organization}
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="text-sm">
                  <span className="text-muted-foreground">Subject: </span>
                  <span className="font-medium">{selectedEmail.subject}</span>
                </p>
              </div>

              <div className="border-t pt-4">
                <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/50 p-4 rounded-lg">
                  {selectedEmail.body.split("\n\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEmail(null)}>
              Close
            </Button>
            {selectedEmail?.status === "SENT" && selectedEmail.gmailThreadId && (
              <Button asChild>
                <Link href={`/conversation/${selectedEmail.id}`}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  View Conversation
                </Link>
              </Button>
            )}
            {selectedEmail?.status !== "SENT" && (
              <Button
                onClick={() => {
                  handleResend(selectedEmail!.id);
                  setSelectedEmail(null);
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
