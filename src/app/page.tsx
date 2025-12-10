import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Sparkles,
  Users,
  FileText,
  Send,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">OutreachAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            AI-Powered Email Outreach
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Send Personalized Professional Emails{" "}
            <span className="text-primary">With AI</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create compelling, personalized outreach emails for job applications,
            research opportunities, collaborations, and mentorship - all powered
            by AI that understands your background.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to send personalized professional emails that get responses
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>1. Build Your Profile</CardTitle>
              <CardDescription>
                Add your background, skills, experience, and upload your CV. The AI uses this context to personalize every email.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>2. Add Recipients</CardTitle>
              <CardDescription>
                Enter details about who you want to reach - their role, organization, research focus, or any relevant information.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>3. Generate & Send</CardTitle>
              <CardDescription>
                AI crafts personalized emails matching your style and the recipient&apos;s context. Review, edit, and send directly.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Perfect For</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: "💼",
              title: "Job Applications",
              description: "Stand out with personalized cold emails to hiring managers",
            },
            {
              icon: "🔬",
              title: "Research Inquiries",
              description: "Connect with professors and researchers effectively",
            },
            {
              icon: "🤝",
              title: "Collaborations",
              description: "Propose partnerships with compelling outreach",
            },
            {
              icon: "🎯",
              title: "Mentorship",
              description: "Reach out to potential mentors professionally",
            },
          ].map((item, i) => (
            <Card key={i} className="text-center p-6">
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features List */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Everything You Need</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "AI-powered personalized email generation",
                "Gmail integration for direct sending",
                "Document upload (CV, transcripts)",
                "Text extraction for AI context",
                "Multiple email tones and purposes",
                "Recipient management",
                "Email history and tracking",
                "Dark mode support",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground">
          <CardContent className="text-center py-12">
            <Send className="h-12 w-12 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl font-bold mb-4">
              Ready to Send Better Emails?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
              Join OutreachAI and start sending personalized professional emails
              that actually get responses.
            </p>
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <Mail className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">OutreachAI</span>
          </div>
          <p>AI-Powered Email Outreach Platform</p>
        </div>
      </footer>
    </div>
  );
}
