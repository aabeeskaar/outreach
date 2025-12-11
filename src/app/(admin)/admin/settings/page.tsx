"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Setting {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Setting[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newSetting, setNewSetting] = useState({ key: "", value: "", category: "general" });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setGrouped(data.grouped);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string, category: string) => {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, category }),
      });
      if (res.ok) {
        toast.success("Setting updated");
        fetchSettings();
      }
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setSaving(null);
    }
  };

  const deleteSetting = async (key: string) => {
    if (!confirm(`Delete setting "${key}"?`)) return;
    try {
      await fetch("/api/admin/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      toast.success("Deleted");
      fetchSettings();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const addSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetting.key || !newSetting.value) return;
    await updateSetting(newSetting.key, newSetting.value, newSetting.category);
    setNewSetting({ key: "", value: "", category: "general" });
  };

  const categories = Object.keys(grouped).length > 0 ? Object.keys(grouped) : ["general"];

  // Default settings to show/create
  const defaultSettings = [
    { key: "app.name", label: "App Name", category: "general", default: "OutreachAI" },
    { key: "app.maintenance_mode", label: "Maintenance Mode", category: "general", default: "false" },
    { key: "pricing.monthly_price", label: "Monthly Price ($)", category: "pricing", default: "10" },
    { key: "pricing.free_email_limit", label: "Free Email Limit", category: "pricing", default: "1" },
    { key: "email.default_tone", label: "Default Tone", category: "email", default: "FORMAL" },
    { key: "email.max_length", label: "Max Email Length", category: "email", default: "2000" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure application settings</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : (
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          {["general", "pricing", "email"].map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize">{category} Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {defaultSettings.filter(s => s.category === category).map((setting) => {
                    const current = settings.find(s => s.key === setting.key);
                    return (
                      <div key={setting.key} className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label>{setting.label}</Label>
                          <Input
                            defaultValue={current?.value || setting.default}
                            onBlur={(e) => {
                              if (e.target.value !== (current?.value || setting.default)) {
                                updateSetting(setting.key, e.target.value, category);
                              }
                            }}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={saving === setting.key}
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector("input");
                            if (input) updateSetting(setting.key, input.value, category);
                          }}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          <TabsContent value="custom" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Custom Settings</CardTitle>
                <CardDescription>Add custom key-value settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={addSetting} className="flex gap-2">
                  <Input
                    placeholder="Key"
                    value={newSetting.key}
                    onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                  />
                  <Input
                    placeholder="Value"
                    value={newSetting.value}
                    onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                  />
                  <Button type="submit"><Plus className="h-4 w-4" /></Button>
                </form>

                {settings.filter(s => !defaultSettings.find(d => d.key === s.key)).map((setting) => (
                  <div key={setting.id} className="flex items-center gap-4">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input value={setting.key} disabled />
                      <Input
                        defaultValue={setting.value}
                        onBlur={(e) => {
                          if (e.target.value !== setting.value) {
                            updateSetting(setting.key, e.target.value, setting.category);
                          }
                        }}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteSetting(setting.key)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                {settings.filter(s => !defaultSettings.find(d => d.key === s.key)).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No custom settings</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
