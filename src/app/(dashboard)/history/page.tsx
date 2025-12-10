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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Inbox,
  MousePointerClick,
  MailOpen,
} from "lucide-react";
import { format, parseISO } from "date-fns";
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
  openCount?: number;
  clickCount?: number;
  recipient: {
    name: string;
    email: string;
    organization: string | null;
  };
}

interface GmailEmail {
  id: string;
  threadId: string;
  subject: string;
  to: string;
  from: string;
  snippet: string;
  body: string;
  date: string;
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
  const [activeTab, setActiveTab] = useState("generated");
  const [emails, setEmails] = useState<Email[]>([]);
  const [gmailEmails, setGmailEmails] = useState<GmailEmail[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedGmailEmail, setSelectedGmailEmail] = useState<GmailEmail | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  useEffect(() => {
    fetchEmails();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === "gmail" && gmailEmails.length === 0 && !gmailError) {
      fetchGmailEmails();
    }
  }, [activeTab]);

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

  const fetchGmailEmails = async (pageToken?: string) => {
    setGmailLoading(true);
    setGmailError(null);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const response = await fetch(`/api/gmail/sent?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (pageToken) {
          setGmailEmails((prev) => [...prev, ...data.emails]);
        } else {
          setGmailEmails(data.emails);
        }
        setNextPageToken(data.nextPageToken);
      } else {
        const data = await response.json();
        if (data.code === "GMAIL_NOT_CONNECTED") {
          setGmailError("Please connect your Gmail account in Settings to view sent emails.");
        } else {
          setGmailError(data.error || "Failed to load Gmail emails");
        }
      }
    } catch (error) {
      console.error("Failed to fetch Gmail emails:", error);
      setGmailError("Failed to load Gmail emails");
    } finally {
      setGmailLoading(false);
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

  const filteredGmailEmails = gmailEmails.filter(
    (email) =>
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.to.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parseGmailDate = (dateStr: string) => {
    try {
      return new Date(dateStr);
    } catch {
      return new Date();
    }
  };

  if (loading && emails.length === 0) {
    return <HistorySkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email History</h2>
          <p className="text-muted-foreground">
            View and manage your generated and sent emails
          </p>
        </div>
        <Button asChild>
          <Link href="/compose">Compose New Email</Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generated">
            <Mail className="mr-2 h-4 w-4" />
            Generated Emails
          </TabsTrigger>
          <TabsTrigger value="gmail">
            <Inbox className="mr-2 h-4 w-4" />
            Gmail Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generated" className="space-y-6">
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pagination?.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Emails</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {emails.filter((e) => e.status === "SENT").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {emails.filter((e) => e.status === "DRAFT").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Drafts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email List */}
          <Card>
            <CardHeader>
              <CardTitle>All Emails</CardTitle>
              <CardDescription>
                {filteredEmails.length} email{filteredEmails.length !== 1 ? "s" : ""}{" "}
                {searchQuery && "matching your search"}
              </CardDescription>
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
                      <TableHead>Subject</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmails.map((email) => {
                      const status = statusConfig[email.status];
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={email.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {email.subject}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{email.recipient.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {email.recipient.email}
                              </p>
                            </div>
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
                              <div className="flex items-center gap-3 text-sm">
                                <span className="flex items-center gap-1" title="Opens">
                                  <MailOpen className="h-3.5 w-3.5 text-blue-500" />
                                  {email.openCount || 0}
                                </span>
                                <span className="flex items-center gap-1" title="Clicks">
                                  <MousePointerClick className="h-3.5 w-3.5 text-green-500" />
                                  {email.clickCount || 0}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
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

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchEmails(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchEmails(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gmail" className="space-y-6">
          {/* Gmail Search and Refresh */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sent emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => fetchGmailEmails()}
              disabled={gmailLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${gmailLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Gmail Emails Card */}
          <Card>
            <CardHeader>
              <CardTitle>Gmail Sent Emails</CardTitle>
              <CardDescription>
                Your recently sent emails from Gmail
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gmailLoading && gmailEmails.length === 0 ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : gmailError ? (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">{gmailError}</p>
                  <Button asChild className="mt-4">
                    <Link href="/settings">Go to Settings</Link>
                  </Button>
                </div>
              ) : gmailEmails.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    No sent emails found
                  </p>
                </div>
              ) : filteredGmailEmails.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    No emails match your search
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGmailEmails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="font-medium max-w-[250px]">
                            <p className="truncate">{email.subject || "(No Subject)"}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {email.snippet}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {email.to}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(parseGmailDate(email.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedGmailEmail(email)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Load More */}
                  {nextPageToken && (
                    <div className="flex justify-center mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => fetchGmailEmails(nextPageToken)}
                        disabled={gmailLoading}
                      >
                        {gmailLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Load More
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generated Email Detail Dialog */}
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

      {/* Gmail Email Detail Dialog */}
      <Dialog open={!!selectedGmailEmail} onOpenChange={() => setSelectedGmailEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGmailEmail?.subject || "(No Subject)"}</DialogTitle>
            <DialogDescription>
              {selectedGmailEmail?.date
                ? `Sent on ${format(parseGmailDate(selectedGmailEmail.date), "MMM d, yyyy 'at' h:mm a")}`
                : "Date not available"}
            </DialogDescription>
          </DialogHeader>
          {selectedGmailEmail && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">From: </span>
                  <span className="font-medium">{selectedGmailEmail.from}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">To: </span>
                  <span className="font-medium">{selectedGmailEmail.to}</span>
                </p>
              </div>

              <div className="border-t pt-4">
                <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/50 p-4 rounded-lg">
                  {selectedGmailEmail.body ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedGmailEmail.body }} />
                  ) : (
                    <p className="text-muted-foreground">{selectedGmailEmail.snippet}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedGmailEmail(null)}>
              Close
            </Button>
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
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
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
