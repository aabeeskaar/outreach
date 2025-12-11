"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HeadphonesIcon,
  MessageSquare,
  Send,
  Star,
  Clock,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface Feedback {
  id: string;
  type: string;
  rating: number | null;
  message: string;
  createdAt: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Support form
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Feedback form
  const [feedbackType, setFeedbackType] = useState("GENERAL");
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ticketsRes, feedbacksRes] = await Promise.all([
        fetch("/api/support"),
        fetch("/api/feedback"),
      ]);

      if (ticketsRes.ok) {
        setTickets(await ticketsRes.json());
      }
      if (feedbacksRes.ok) {
        setFeedbacks(await feedbacksRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmittingTicket(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description, priority }),
      });

      if (res.ok) {
        toast.success("Support ticket submitted!");
        setSubject("");
        setDescription("");
        setPriority("MEDIUM");
        fetchData();
      } else {
        throw new Error("Failed to submit ticket");
      }
    } catch (error) {
      console.error("Submit ticket error:", error);
      toast.error("Failed to submit ticket");
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setSubmittingFeedback(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          rating: feedbackRating || null,
          message: feedbackMessage,
        }),
      });

      if (res.ok) {
        toast.success("Thank you for your feedback!");
        setFeedbackType("GENERAL");
        setFeedbackRating(0);
        setFeedbackMessage("");
        fetchData();
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Submit feedback error:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: "bg-red-100 text-red-700",
      IN_PROGRESS: "bg-yellow-100 text-yellow-700",
      RESOLVED: "bg-green-100 text-green-700",
      CLOSED: "bg-gray-100 text-gray-700",
    };
    return (
      <Badge className={styles[status] || styles.OPEN}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="text-muted-foreground">
          Get help or share your feedback with us
        </p>
      </div>

      <Tabs defaultValue="support" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="support" className="gap-2">
            <HeadphonesIcon className="h-4 w-4" />
            Support
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Support Ticket</CardTitle>
              <CardDescription>
                Describe your issue and we&apos;ll get back to you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    rows={5}
                  />
                </div>

                <Button type="submit" disabled={submittingTicket} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {submittingTicket ? "Submitting..." : "Submit Ticket"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {tickets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Tickets</CardTitle>
                <CardDescription>Track your support requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-center gap-3">
                        {ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(ticket.createdAt)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(ticket.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Share Feedback</CardTitle>
              <CardDescription>
                Help us improve OutreachAI with your feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feedbackType">Type</Label>
                  <Select value={feedbackType} onValueChange={setFeedbackType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General Feedback</SelectItem>
                      <SelectItem value="BUG">Bug Report</SelectItem>
                      <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
                      <SelectItem value="COMPLIMENT">Compliment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rating (Optional)</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star === feedbackRating ? 0 : star)}
                        className="p-1"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= feedbackRating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedbackMessage">Your Feedback</Label>
                  <Textarea
                    id="feedbackMessage"
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows={5}
                  />
                </div>

                <Button type="submit" disabled={submittingFeedback} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {feedbacks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Feedback History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">
                          {feedback.type.replace("_", " ")}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(feedback.createdAt)}
                        </span>
                      </div>
                      {feedback.rating && (
                        <div className="flex gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= feedback.rating!
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-sm">{feedback.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              Created on {selectedTicket && formatDate(selectedTicket.createdAt)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {selectedTicket && getStatusBadge(selectedTicket.status)}
              <Badge variant="outline">{selectedTicket?.priority}</Badge>
            </div>
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedTicket?.description}
              </p>
            </div>
            {selectedTicket?.resolvedAt && (
              <p className="text-sm text-green-600">
                Resolved on {formatDate(selectedTicket.resolvedAt)}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
