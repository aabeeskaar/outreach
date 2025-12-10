"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Mail,
  Building,
  Briefcase,
  Globe,
  Linkedin,
  Loader2,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface Recipient {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  role: string | null;
  website: string | null;
  linkedinUrl: string | null;
  workFocus: string | null;
  additionalNotes: string | null;
  createdAt: string;
  _count?: {
    generatedEmails: number;
  };
}

const initialFormData = {
  name: "",
  email: "",
  organization: "",
  role: "",
  website: "",
  linkedinUrl: "",
  workFocus: "",
  additionalNotes: "",
};

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    try {
      const response = await fetch("/api/recipients");
      if (response.ok) {
        const data = await response.json();
        setRecipients(data);
      }
    } catch (error) {
      console.error("Failed to fetch recipients:", error);
      toast.error("Failed to load recipients");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/api/recipients/${editingId}`
        : "/api/recipients";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const recipient = await response.json();
        if (editingId) {
          setRecipients(
            recipients.map((r) => (r.id === editingId ? { ...r, ...recipient } : r))
          );
          toast.success("Recipient updated");
        } else {
          setRecipients([recipient, ...recipients]);
          toast.success("Recipient created");
        }
        closeDialog();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save recipient");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save recipient");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (recipient: Recipient) => {
    setEditingId(recipient.id);
    setFormData({
      name: recipient.name,
      email: recipient.email,
      organization: recipient.organization || "",
      role: recipient.role || "",
      website: recipient.website || "",
      linkedinUrl: recipient.linkedinUrl || "",
      workFocus: recipient.workFocus || "",
      additionalNotes: recipient.additionalNotes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recipient?")) return;

    try {
      const response = await fetch(`/api/recipients/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRecipients(recipients.filter((r) => r.id !== id));
        toast.success("Recipient deleted");
      } else {
        toast.error("Failed to delete recipient");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete recipient");
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const filteredRecipients = recipients.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.organization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <RecipientsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recipients</h2>
          <p className="text-muted-foreground">
            Manage your email recipients and their information
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormData)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Recipient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Recipient" : "Add New Recipient"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the recipient's information"
                  : "Add a new person you want to reach out to"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="John Smith"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) =>
                        setFormData({ ...formData, organization: e.target.value })
                      }
                      placeholder="Google, Stanford University, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role / Position</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                      placeholder="Professor, Engineering Manager, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                    <Input
                      id="linkedin"
                      value={formData.linkedinUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, linkedinUrl: e.target.value })
                      }
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workFocus">Research/Work Focus</Label>
                  <Textarea
                    id="workFocus"
                    value={formData.workFocus}
                    onChange={(e) =>
                      setFormData({ ...formData, workFocus: e.target.value })
                    }
                    placeholder="Their research interests, projects they're working on, recent publications, etc."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.additionalNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, additionalNotes: e.target.value })
                    }
                    placeholder="Any other relevant information..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Save Changes" : "Add Recipient"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      {recipients.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Recipients List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Recipients</CardTitle>
          <CardDescription>
            {recipients.length} recipient{recipients.length !== 1 ? "s" : ""} saved
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No recipients yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add recipients to start sending personalized emails
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Recipient
              </Button>
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No recipients match your search
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Emails</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {recipient.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {recipient.organization ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {recipient.organization}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {recipient.role ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {recipient.role}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{recipient._count?.generatedEmails || 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(recipient.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/compose?recipientId=${recipient.id}`}>
                              <Mail className="mr-2 h-4 w-4" />
                              Compose Email
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(recipient)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {recipient.website && (
                            <DropdownMenuItem asChild>
                              <a
                                href={recipient.website}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Globe className="mr-2 h-4 w-4" />
                                Visit Website
                              </a>
                            </DropdownMenuItem>
                          )}
                          {recipient.linkedinUrl && (
                            <DropdownMenuItem asChild>
                              <a
                                href={recipient.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Linkedin className="mr-2 h-4 w-4" />
                                View LinkedIn
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(recipient.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecipientsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-72" />
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
