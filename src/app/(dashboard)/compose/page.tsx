"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  PenSquare,
  Sparkles,
  Send,
  Save,
  RefreshCw,
  Loader2,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  Eye,
  Bot,
  Crown,
} from "lucide-react";

interface Recipient {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  role: string | null;
}

interface Document {
  id: string;
  name: string;
  type: string;
}

function ComposePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedRecipientId = searchParams.get("recipientId");

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("JOB_APPLICATION");
  const [tone, setTone] = useState<string>("FORMAL");
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [aiProvider, setAiProvider] = useState<string>("gemini");
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [emailId, setEmailId] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [subscription, setSubscription] = useState<{
    isPro: boolean;
    freeEmailsUsed: number;
    freeEmailsRemaining: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (preSelectedRecipientId && recipients.length > 0) {
      setSelectedRecipient(preSelectedRecipientId);
    }
  }, [preSelectedRecipientId, recipients]);

  const fetchData = async () => {
    try {
      const [recipientsRes, documentsRes, gmailRes, providersRes, subscriptionRes] = await Promise.all([
        fetch("/api/recipients"),
        fetch("/api/documents"),
        fetch("/api/gmail/status"),
        fetch("/api/ai/providers"),
        fetch("/api/subscription"),
      ]);

      if (recipientsRes.ok) {
        const data = await recipientsRes.json();
        setRecipients(data);
      }
      if (documentsRes.ok) {
        const data = await documentsRes.json();
        setDocuments(data.filter((d: Document & { extractedText?: string }) => d.extractedText));
      }
      if (gmailRes.ok) {
        const data = await gmailRes.json();
        setGmailConnected(data.connected);
      }
      if (providersRes.ok) {
        const data = await providersRes.json();
        setAvailableProviders(data.providers);
        if (data.default) {
          setAiProvider(data.default);
        }
      }
      if (subscriptionRes.ok) {
        const data = await subscriptionRes.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedRecipient) {
      toast.error("Please select a recipient");
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch("/api/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: selectedRecipient,
          purpose,
          tone,
          additionalContext,
          provider: aiProvider,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubject(data.subject);
        setBody(data.body);
        toast.success("Email generated!");
        // Refresh subscription status
        const subRes = await fetch("/api/subscription");
        if (subRes.ok) {
          setSubscription(await subRes.json());
        }
      } else {
        const data = await response.json();
        if (data.requiresUpgrade) {
          setShowUpgradeDialog(true);
        } else {
          toast.error(data.error || "Failed to generate email");
        }
      }
    } catch (error) {
      console.error("Generate error:", error);
      toast.error("Failed to generate email");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedRecipient || !subject || !body) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);

    try {
      const url = emailId ? `/api/emails/${emailId}` : "/api/emails";
      const method = emailId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: selectedRecipient,
          subject,
          body,
          tone,
          purpose,
          attachedDocuments: selectedDocs,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmailId(data.id);
        toast.success("Draft saved!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save draft");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!gmailConnected) {
      toast.error("Please connect Gmail in settings first");
      return;
    }

    if (!selectedRecipient || !subject || !body) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Save first if not saved
    if (!emailId) {
      await handleSaveDraft();
      // Wait a moment for emailId to be set
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!emailId) {
      toast.error("Please save the draft first");
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`/api/emails/${emailId}/send`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Email sent successfully!");
        router.push("/history");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const selectedRecipientData = recipients.find((r) => r.id === selectedRecipient);

  if (loading) {
    return <ComposeSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compose Email</h2>
          <p className="text-muted-foreground">
            Generate and send personalized professional emails
          </p>
        </div>
        {subscription && (
          <div className="text-right">
            {subscription.isPro ? (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
                <Crown className="h-3 w-3 mr-1" />
                Pro
              </Badge>
            ) : (
              <div className="space-y-1">
                <Badge variant="secondary">
                  {subscription.freeEmailsRemaining} free email remaining
                </Badge>
                <p className="text-xs text-muted-foreground">
                  <button
                    onClick={() => router.push("/pricing")}
                    className="text-primary hover:underline"
                  >
                    Upgrade for unlimited
                  </button>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Settings */}
        <div className="space-y-6">
          {/* Recipient Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Recipient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recipients.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    No recipients yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/recipients")}
                  >
                    Add Recipient
                  </Button>
                </div>
              ) : (
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipients.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex flex-col">
                          <span>{r.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.organization || r.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedRecipientData && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium">{selectedRecipientData.name}</p>
                  <p className="text-muted-foreground">{selectedRecipientData.email}</p>
                  {selectedRecipientData.organization && (
                    <p className="text-muted-foreground">{selectedRecipientData.organization}</p>
                  )}
                  {selectedRecipientData.role && (
                    <p className="text-muted-foreground">{selectedRecipientData.role}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4" />
                AI Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableProviders.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    No AI provider configured
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add GOOGLE_GEMINI_API_KEY to your .env file
                  </p>
                </div>
              ) : (
                <Select value={aiProvider} onValueChange={setAiProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.includes("gemini") && (
                      <SelectItem value="gemini">
                        <div className="flex items-center gap-2">
                          <span>Google Gemini</span>
                          <Badge variant="secondary" className="text-xs">Free</Badge>
                        </div>
                      </SelectItem>
                    )}
                    {availableProviders.includes("groq") && (
                      <SelectItem value="groq">
                        <div className="flex items-center gap-2">
                          <span>Groq (Llama 3.1)</span>
                          <Badge variant="secondary" className="text-xs">Free</Badge>
                        </div>
                      </SelectItem>
                    )}
                    {availableProviders.includes("claude") && (
                      <SelectItem value="claude">
                        <div className="flex items-center gap-2">
                          <span>Claude (Anthropic)</span>
                          <Badge variant="outline" className="text-xs">Paid</Badge>
                        </div>
                      </SelectItem>
                    )}
                    {availableProviders.includes("chatgpt") && (
                      <SelectItem value="chatgpt">
                        <div className="flex items-center gap-2">
                          <span>ChatGPT (OpenAI)</span>
                          <Badge variant="outline" className="text-xs">Paid</Badge>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JOB_APPLICATION">Job Application</SelectItem>
                    <SelectItem value="RESEARCH_INQUIRY">Research Inquiry</SelectItem>
                    <SelectItem value="COLLABORATION">Collaboration</SelectItem>
                    <SelectItem value="MENTORSHIP">Mentorship</SelectItem>
                    <SelectItem value="NETWORKING">Networking</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FORMAL">Formal</SelectItem>
                    <SelectItem value="FRIENDLY">Friendly</SelectItem>
                    <SelectItem value="CONCISE">Concise</SelectItem>
                    <SelectItem value="ENTHUSIASTIC">Enthusiastic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Additional Context (optional)</Label>
                <Textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Any specific points to mention..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Attachments
                </CardTitle>
                <CardDescription>Select documents to attach</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={doc.id}
                        checked={selectedDocs.includes(doc.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDocs([...selectedDocs, doc.id]);
                          } else {
                            setSelectedDocs(selectedDocs.filter((id) => id !== doc.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={doc.id}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        {doc.name}
                        <Badge variant="outline" className="text-xs">
                          {doc.type}
                        </Badge>
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || !selectedRecipient}
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate Email with AI"}
          </Button>
        </div>

        {/* Right Column - Email Editor */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenSquare className="h-5 w-5" />
                Email Content
              </CardTitle>
              <CardDescription>
                Edit the generated email or write your own
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gmail Status */}
              {!gmailConnected && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-200">
                    Connect Gmail in settings to send emails
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Email body content..."
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={generating || !selectedRecipient}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>

                <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!body}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>

                <Button variant="outline" onClick={handleSaveDraft} disabled={saving || !subject || !body}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Draft
                </Button>

                <Button
                  onClick={handleSend}
                  disabled={sending || !gmailConnected || !subject || !body}
                  className="ml-auto"
                >
                  {sending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Email
                </Button>
              </div>

              {emailId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Draft saved
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Upgrade to Pro
            </DialogTitle>
            <DialogDescription>
              You&apos;ve used your free email generation. Upgrade to Pro for unlimited AI-generated emails.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">Pro Plan - $10/month</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Unlimited AI-generated emails</li>
                <li>• All AI providers (Gemini, Claude)</li>
                <li>• Advanced email tracking</li>
                <li>• Priority support</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => router.push("/pricing")} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
              <Crown className="mr-2 h-4 w-4" />
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview how your email will appear to the recipient
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRecipientData && (
              <div className="text-sm">
                <span className="text-muted-foreground">To: </span>
                <span>
                  {selectedRecipientData.name} &lt;{selectedRecipientData.email}&gt;
                </span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium">{subject}</span>
            </div>
            <div className="border-t pt-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {body.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>
            {selectedDocs.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Attachments:</p>
                <div className="flex flex-wrap gap-2">
                  {documents
                    .filter((d) => selectedDocs.includes(d.id))
                    .map((doc) => (
                      <Badge key={doc.id} variant="secondary">
                        <FileText className="mr-1 h-3 w-3" />
                        {doc.name}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSend} disabled={sending || !gmailConnected}>
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<ComposeSkeleton />}>
      <ComposePageContent />
    </Suspense>
  );
}

function ComposeSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
