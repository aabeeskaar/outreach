"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save, Plus, Trash2, Eye, EyeOff, Key, AlertCircle, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Setting {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
}

interface EnvVar {
  id: string;
  key: string;
  value: string;
  target: string[];
  type: string;
  isSecret: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Setting[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newSetting, setNewSetting] = useState({ key: "", value: "", category: "general" });

  // Environment Variables state
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [envLoading, setEnvLoading] = useState(true);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [editingEnv, setEditingEnv] = useState<EnvVar | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [envForm, setEnvForm] = useState({
    key: "",
    value: "",
    type: "encrypted" as "plain" | "encrypted" | "secret" | "sensitive",
    target: {
      production: true,
      preview: true,
      development: true,
    },
  });

  useEffect(() => {
    fetchSettings();
    fetchEnvVars();
  }, []);

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

  const fetchEnvVars = async () => {
    setEnvLoading(true);
    try {
      const res = await fetch("/api/admin/env-vars");
      if (res.ok) {
        const data = await res.json();
        setEnvConfigured(data.configured);
        setEnvVars(data.envVars || []);
      }
    } catch (error) {
      console.error("Failed to fetch env vars:", error);
    } finally {
      setEnvLoading(false);
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
    } catch {
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
    } catch {
      toast.error("Failed to delete");
    }
  };

  const addSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetting.key || !newSetting.value) return;
    await updateSetting(newSetting.key, newSetting.value, newSetting.category);
    setNewSetting({ key: "", value: "", category: "general" });
  };

  // Environment Variables handlers
  const handleAddEnvVar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!envForm.key || !envForm.value) {
      toast.error("Key and value are required");
      return;
    }

    const target: ("production" | "preview" | "development")[] = [];
    if (envForm.target.production) target.push("production");
    if (envForm.target.preview) target.push("preview");
    if (envForm.target.development) target.push("development");

    if (target.length === 0) {
      toast.error("Select at least one target environment");
      return;
    }

    setSaving("env-add");
    try {
      const res = await fetch("/api/admin/env-vars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: envForm.key.toUpperCase(),
          value: envForm.value,
          type: envForm.type,
          target,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Environment variable created");
        setShowAddEnv(false);
        setEnvForm({
          key: "",
          value: "",
          type: "encrypted",
          target: { production: true, preview: true, development: true },
        });
        fetchEnvVars();
      } else {
        toast.error(data.error || "Failed to create");
      }
    } catch {
      toast.error("Failed to create environment variable");
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateEnvVar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnv || !envForm.value) {
      toast.error("Value is required");
      return;
    }

    const target: ("production" | "preview" | "development")[] = [];
    if (envForm.target.production) target.push("production");
    if (envForm.target.preview) target.push("preview");
    if (envForm.target.development) target.push("development");

    if (target.length === 0) {
      toast.error("Select at least one target environment");
      return;
    }

    setSaving("env-edit");
    try {
      const res = await fetch("/api/admin/env-vars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEnv.id,
          value: envForm.value,
          type: envForm.type,
          target,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Environment variable updated");
        setEditingEnv(null);
        fetchEnvVars();
      } else {
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update environment variable");
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteEnvVar = async (env: EnvVar) => {
    if (!confirm(`Delete environment variable "${env.key}"? This will require a redeploy to take effect.`)) return;

    try {
      const res = await fetch("/api/admin/env-vars", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: env.id, key: env.key }),
      });

      if (res.ok) {
        toast.success("Environment variable deleted");
        fetchEnvVars();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete environment variable");
    }
  };

  const openEditEnv = (env: EnvVar) => {
    setEditingEnv(env);
    setEnvForm({
      key: env.key,
      value: env.isSecret ? "" : env.value,
      type: env.type as "plain" | "encrypted" | "secret" | "sensitive",
      target: {
        production: env.target.includes("production"),
        preview: env.target.includes("preview"),
        development: env.target.includes("development"),
      },
    });
  };

  const toggleShowValue = (id: string) => {
    setShowValues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getTargetBadges = (target: string[]) => {
    return (
      <div className="flex gap-1">
        {target.includes("production") && (
          <Badge variant="default" className="text-xs">Production</Badge>
        )}
        {target.includes("preview") && (
          <Badge variant="secondary" className="text-xs">Preview</Badge>
        )}
        {target.includes("development") && (
          <Badge variant="outline" className="text-xs">Development</Badge>
        )}
      </div>
    );
  };

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
            <TabsTrigger value="env" className="gap-2">
              <Key className="h-3 w-3" />
              Environment
            </TabsTrigger>
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

          {/* Environment Variables Tab */}
          <TabsContent value="env" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Environment Variables
                    </CardTitle>
                    <CardDescription>
                      Manage Vercel environment variables. Changes require a redeploy to take effect.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchEnvVars} disabled={envLoading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${envLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                    {envConfigured && (
                      <Button size="sm" onClick={() => setShowAddEnv(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Variable
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {envLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : !envConfigured ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Vercel API Not Configured</h3>
                    <p className="text-muted-foreground max-w-md mb-4">
                      To manage environment variables, you need to configure your Vercel API credentials.
                    </p>
                    <div className="bg-muted p-4 rounded-lg text-left text-sm font-mono">
                      <p>VERCEL_API_TOKEN=your_token</p>
                      <p>VERCEL_PROJECT_ID=your_project_id</p>
                      <p>VERCEL_TEAM_ID=your_team_id (optional)</p>
                    </div>
                  </div>
                ) : envVars.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No environment variables found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {envVars.map((env) => (
                      <div
                        key={env.id}
                        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-medium text-sm">{env.key}</span>
                            {env.isSecret && (
                              <Badge variant="outline" className="text-xs">
                                <Key className="h-3 w-3 mr-1" />
                                Secret
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono truncate max-w-xs">
                              {env.isSecret ? (
                                showValues[env.id] ? env.value : "••••••••••••"
                              ) : (
                                showValues[env.id] ? env.value : env.value.substring(0, 30) + (env.value.length > 30 ? "..." : "")
                              )}
                            </span>
                            {!env.isSecret && env.value.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleShowValue(env.id)}
                              >
                                {showValues[env.id] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="mt-2">
                            {getTargetBadges(env.target)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditEnv(env)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEnvVar(env)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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

      {/* Add Environment Variable Dialog */}
      <Dialog open={showAddEnv} onOpenChange={setShowAddEnv}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Environment Variable</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddEnvVar} className="space-y-4">
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                placeholder="MY_API_KEY"
                value={envForm.key}
                onChange={(e) => setEnvForm({ ...envForm, key: e.target.value.toUpperCase() })}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Uppercase letters, numbers, and underscores only
              </p>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                placeholder="Enter value"
                value={envForm.value}
                onChange={(e) => setEnvForm({ ...envForm, value: e.target.value })}
                type={envForm.type === "secret" || envForm.type === "sensitive" ? "password" : "text"}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={envForm.type}
                onValueChange={(v) => setEnvForm({ ...envForm, type: v as typeof envForm.type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="encrypted">Encrypted</SelectItem>
                  <SelectItem value="plain">Plain Text</SelectItem>
                  <SelectItem value="sensitive">Sensitive</SelectItem>
                  <SelectItem value="secret">Secret</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Environments</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={envForm.target.production}
                    onCheckedChange={(c) => setEnvForm({ ...envForm, target: { ...envForm.target, production: !!c } })}
                  />
                  <span className="text-sm">Production</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={envForm.target.preview}
                    onCheckedChange={(c) => setEnvForm({ ...envForm, target: { ...envForm.target, preview: !!c } })}
                  />
                  <span className="text-sm">Preview</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={envForm.target.development}
                    onCheckedChange={(c) => setEnvForm({ ...envForm, target: { ...envForm.target, development: !!c } })}
                  />
                  <span className="text-sm">Development</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddEnv(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving === "env-add"}>
                {saving === "env-add" ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Environment Variable Dialog */}
      <Dialog open={!!editingEnv} onOpenChange={() => setEditingEnv(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Environment Variable</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateEnvVar} className="space-y-4">
            <div className="space-y-2">
              <Label>Key</Label>
              <Input value={editingEnv?.key || ""} disabled className="font-mono bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                placeholder={editingEnv?.isSecret ? "Enter new value (leave empty to keep current)" : "Enter value"}
                value={envForm.value}
                onChange={(e) => setEnvForm({ ...envForm, value: e.target.value })}
                type={envForm.type === "secret" || envForm.type === "sensitive" ? "password" : "text"}
              />
              {editingEnv?.isSecret && (
                <p className="text-xs text-muted-foreground">
                  Current value is hidden. Enter a new value to update.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={envForm.type}
                onValueChange={(v) => setEnvForm({ ...envForm, type: v as typeof envForm.type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="encrypted">Encrypted</SelectItem>
                  <SelectItem value="plain">Plain Text</SelectItem>
                  <SelectItem value="sensitive">Sensitive</SelectItem>
                  <SelectItem value="secret">Secret</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Environments</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={envForm.target.production}
                    onCheckedChange={(c) => setEnvForm({ ...envForm, target: { ...envForm.target, production: !!c } })}
                  />
                  <span className="text-sm">Production</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={envForm.target.preview}
                    onCheckedChange={(c) => setEnvForm({ ...envForm, target: { ...envForm.target, preview: !!c } })}
                  />
                  <span className="text-sm">Preview</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={envForm.target.development}
                    onCheckedChange={(c) => setEnvForm({ ...envForm, target: { ...envForm.target, development: !!c } })}
                  />
                  <span className="text-sm">Development</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingEnv(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving === "env-edit"}>
                {saving === "env-edit" ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
