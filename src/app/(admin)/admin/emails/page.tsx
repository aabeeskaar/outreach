"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Send, FileText, Eye, MousePointer, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Email {
  id: string;
  subject: string;
  body: string;
  tone: string;
  purpose: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  user: { email: string; name: string | null };
  recipient: { name: string; email: string; organization: string | null };
  _count: { emailOpens: number; linkClicks: number };
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, sent: 0, draft: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  useEffect(() => {
    fetchEmails();
  }, [page, statusFilter]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/emails?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotalPages(data.pagination.totalPages);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmails();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SENT: "bg-green-100 text-green-700",
      DRAFT: "bg-gray-100 text-gray-700",
      FAILED: "bg-red-100 text-red-700",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Logs</h1>
        <p className="text-muted-foreground">View all generated emails</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Generated</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.sent}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.draft}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Emails</CardTitle>
              <CardDescription>Generated email history</CardDescription>
            </div>
            <div className="flex gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
                <Button type="submit" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
              </form>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : emails.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No emails found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="text-sm">{email.user.name || email.user.email}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{email.recipient.name}</div>
                          <div className="text-muted-foreground text-xs">{email.recipient.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{email.subject}</TableCell>
                      <TableCell>{getStatusBadge(email.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 text-xs">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {email._count.emailOpens}</span>
                          <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" /> {email._count.linkClicks}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(email.createdAt)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setSelectedEmail(email)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmail?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {selectedEmail && getStatusBadge(selectedEmail.status)}
              <Badge variant="outline">{selectedEmail?.tone}</Badge>
              <Badge variant="outline">{selectedEmail?.purpose}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">From:</span> {selectedEmail?.user.email}</div>
              <div><span className="text-muted-foreground">To:</span> {selectedEmail?.recipient.email}</div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{selectedEmail?.body}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
