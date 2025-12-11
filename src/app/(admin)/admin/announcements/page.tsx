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
import { Switch } from "@/components/ui/switch";
import { Megaphone, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  showFrom: string;
  showUntil: string | null;
  targetRoles: string[];
  dismissible: boolean;
  link: string | null;
  linkText: string | null;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", message: "", type: "INFO", showUntil: "", dismissible: true, link: "", linkText: "",
  });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch("/api/admin/announcements", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editing ? "Updated" : "Created");
        setShowCreate(false);
        setEditing(null);
        setForm({ title: "", message: "", type: "INFO", showUntil: "", dismissible: true, link: "", linkText: "" });
        fetchAnnouncements();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed");
      }
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      fetchAnnouncements();
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await fetch("/api/admin/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      toast.success("Deleted");
      fetchAnnouncements();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title, message: a.message, type: a.type,
      showUntil: a.showUntil?.split("T")[0] || "", dismissible: a.dismissible,
      link: a.link || "", linkText: a.linkText || "",
    });
    setShowCreate(true);
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      INFO: "bg-blue-100 text-blue-700",
      WARNING: "bg-yellow-100 text-yellow-700",
      SUCCESS: "bg-green-100 text-green-700",
      ERROR: "bg-red-100 text-red-700",
    };
    return <Badge className={styles[type] || ""}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">Manage site-wide announcements</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowCreate(true); }}><Plus className="h-4 w-4 mr-2" /> Create</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Announcements</CardTitle>
          <CardDescription>{announcements.length} announcements</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{getTypeBadge(a.type)}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{a.message}</TableCell>
                    <TableCell><Switch checked={a.isActive} onCheckedChange={(v) => toggleActive(a.id, v)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Announcement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Show Until (optional)</Label>
                <Input type="date" value={form.showUntil} onChange={(e) => setForm({ ...form, showUntil: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link URL (optional)</Label>
                <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Link Text</Label>
                <Input value={form.linkText} onChange={(e) => setForm({ ...form, linkText: e.target.value })} placeholder="Learn more" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.dismissible} onCheckedChange={(v) => setForm({ ...form, dismissible: v })} />
              <Label>Allow users to dismiss</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
