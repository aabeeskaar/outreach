"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Ticket, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  _count: { uses: number };
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "", description: "", discountType: "PERCENTAGE", discountValue: 10, maxUses: "", validUntil: "",
  });

  useEffect(() => { fetchCodes(); }, []);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes");
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes);
      }
    } catch (error) {
      console.error("Failed to fetch promo codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          maxUses: form.maxUses ? parseInt(form.maxUses) : null,
          validUntil: form.validUntil || null,
        }),
      });
      if (res.ok) {
        toast.success("Promo code created");
        setShowCreate(false);
        setForm({ code: "", description: "", discountType: "PERCENTAGE", discountValue: 10, maxUses: "", validUntil: "" });
        fetchCodes();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create");
      }
    } catch (error) {
      toast.error("Failed to create promo code");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch("/api/admin/promo-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      fetchCodes();
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promo code?")) return;
    try {
      await fetch("/api/admin/promo-codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      toast.success("Deleted");
      fetchCodes();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground">Manage discount codes</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Create Code</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Promo Codes</CardTitle>
          <CardDescription>{codes.length} codes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : codes.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No promo codes yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <div>
                        <code className="font-mono font-bold">{code.code}</code>
                        {code.description && <p className="text-xs text-muted-foreground">{code.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {code.discountType === "PERCENTAGE" ? `${code.discountValue}%` :
                         code.discountType === "FIXED_AMOUNT" ? `$${code.discountValue}` :
                         `${code.discountValue} days free`}
                      </Badge>
                    </TableCell>
                    <TableCell>{code._count.uses}{code.maxUses ? ` / ${code.maxUses}` : ""}</TableCell>
                    <TableCell className="text-muted-foreground">{code.validUntil ? formatDate(code.validUntil) : "Never"}</TableCell>
                    <TableCell>
                      <Switch checked={code.isActive} onCheckedChange={(v) => toggleActive(code.id, v)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(code.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Promo Code</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER2024" required />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Summer sale discount" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                    <SelectItem value="FREE_TRIAL_DAYS">Free Trial Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Uses (optional)</Label>
                <Input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited" />
              </div>
              <div className="space-y-2">
                <Label>Valid Until (optional)</Label>
                <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
