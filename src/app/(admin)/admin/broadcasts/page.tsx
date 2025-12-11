"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mail, Plus, Send, Eye, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface Broadcast {
  id: string;
  subject: string;
  body: string;
  targetType: string;
  status: string;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  sender: { name: string | null; email: string } | null;
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    content: "",
    targetType: "ALL_USERS",
    scheduledFor: "",
  });

  useEffect(() => { fetchBroadcasts(); }, []);

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/broadcasts");
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data.broadcasts);
      }
    } catch (error) {
      console.error("Failed to fetch broadcasts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject,
          body: form.content,
          targetType: form.targetType,
          scheduledAt: form.scheduledFor || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.status === "SCHEDULED" ? "Broadcast scheduled" : "Broadcast created");
        setShowCreate(false);
        setForm({ subject: "", content: "", targetType: "ALL_USERS", scheduledFor: "" });
        fetchBroadcasts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create");
      }
    } catch (error) {
      toast.error("Failed to create broadcast");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this broadcast?")) return;
    try {
      await fetch("/api/admin/broadcasts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      toast.success("Deleted");
      fetchBroadcasts();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm("Send this broadcast to all target users?")) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "send" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Broadcast sent to ${data.sentTo} users${data.failed > 0 ? ` (${data.failed} failed)` : ""}`);
        fetchBroadcasts();
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-700",
      SCHEDULED: "bg-blue-100 text-blue-700",
      SENDING: "bg-yellow-100 text-yellow-700",
      SENT: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  const getTargetLabel = (target: string) => {
    const labels: Record<string, string> = {
      ALL_USERS: "All Users",
      PRO_USERS: "Pro Users",
      FREE_USERS: "Free Users",
      ADMINS: "Admins Only",
    };
    return labels[target] || target;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Broadcasts</h1>
          <p className="text-muted-foreground">Send emails to all users</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> New Broadcast</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Broadcasts</CardTitle>
          <CardDescription>{broadcasts.length} broadcasts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No broadcasts yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium max-w-xs truncate">{b.subject}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="text-sm">{getTargetLabel(b.targetType)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(b.status)}</TableCell>
                    <TableCell>
                      {b.status === "SENT" ? (
                        <span className="text-sm">
                          <span className="text-green-600">{b.sentCount}</span>
                          {b.failedCount > 0 && <span className="text-red-600"> / {b.failedCount} failed</span>}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {b.sentAt ? formatDate(b.sentAt) : b.scheduledAt ? `Scheduled: ${formatDate(b.scheduledAt)}` : formatDate(b.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedBroadcast(b)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(b.status === "DRAFT" || b.status === "SCHEDULED") && (
                          <Button variant="ghost" size="icon" onClick={() => handleSend(b.id)} disabled={sending}>
                            <Send className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {b.status !== "SENT" && b.status !== "SENDING" && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Broadcast</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Email subject line" required />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} placeholder="Email content (HTML supported)" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={form.targetType} onValueChange={(v) => setForm({ ...form, targetType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_USERS">All Users</SelectItem>
                    <SelectItem value="PRO_USERS">Pro Users Only</SelectItem>
                    <SelectItem value="FREE_USERS">Free Users Only</SelectItem>
                    <SelectItem value="ADMINS">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Schedule (optional)</Label>
                <Input type="datetime-local" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={sending}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : form.scheduledFor ? "Schedule" : "Send Now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBroadcast} onOpenChange={() => setSelectedBroadcast(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Broadcast Details</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Subject</Label>
              <p className="font-medium">{selectedBroadcast?.subject}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Content</Label>
              <div className="mt-1 p-4 bg-muted rounded-lg prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedBroadcast?.body || "" }} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Target</Label>
                <p>{selectedBroadcast && getTargetLabel(selectedBroadcast.targetType)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p>{selectedBroadcast && getStatusBadge(selectedBroadcast.status)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Sent By</Label>
                <p>{selectedBroadcast?.sender?.name || selectedBroadcast?.sender?.email || "—"}</p>
              </div>
            </div>
            {selectedBroadcast?.status === "SENT" && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Successfully Sent</Label>
                  <p className="text-green-600 font-medium">{selectedBroadcast.sentCount}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Failed</Label>
                  <p className={selectedBroadcast.failedCount > 0 ? "text-red-600 font-medium" : ""}>{selectedBroadcast.failedCount}</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
