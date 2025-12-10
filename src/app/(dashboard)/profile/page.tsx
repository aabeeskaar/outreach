"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Briefcase,
  GraduationCap,
  Target,
  Link as LinkIcon,
  Plus,
  X,
  Loader2,
  Save,
  FileText,
  Sparkles,
} from "lucide-react";

interface Education {
  institution: string;
  degree: string;
  field: string;
  year: string;
}

interface Experience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

interface Profile {
  id: string;
  headline: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  education: Education[];
  experience: Experience[];
  goals: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  otherLinks: string[];
  user: {
    name: string | null;
    email: string;
  };
}

interface Document {
  id: string;
  name: string;
  type: string;
  extractedText: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchDocuments();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile({
          ...data,
          education: Array.isArray(data.education) ? data.education : [],
          experience: Array.isArray(data.experience) ? data.experience : [],
          otherLinks: Array.isArray(data.otherLinks) ? data.otherLinks : [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        // Filter to only show CV/Resume type documents with extracted text
        setDocuments(data.filter((doc: Document) => doc.extractedText));
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  const handleFillFromResume = async (documentId: string) => {
    if (!profile) return;

    setExtracting(true);
    try {
      const response = await fetch("/api/profile/extract-from-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      if (response.ok) {
        const data = await response.json();
        const extracted = data.extractedProfile;

        // Merge extracted data with existing profile (only fill empty fields or replace all)
        setProfile({
          ...profile,
          user: {
            ...profile.user,
            name: extracted.name || profile.user.name,
          },
          headline: extracted.headline || profile.headline,
          bio: extracted.bio || profile.bio,
          skills: extracted.skills.length > 0 ? extracted.skills : profile.skills,
          interests: extracted.interests.length > 0 ? extracted.interests : profile.interests,
          education: extracted.education.length > 0 ? extracted.education : profile.education,
          experience: extracted.experience.length > 0 ? extracted.experience : profile.experience,
          goals: extracted.goals || profile.goals,
          linkedinUrl: extracted.linkedinUrl || profile.linkedinUrl,
          githubUrl: extracted.githubUrl || profile.githubUrl,
          portfolioUrl: extracted.portfolioUrl || profile.portfolioUrl,
        });

        toast.success("Profile filled from resume! Review the changes and click Save.");
        setShowResumeDialog(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to extract profile from resume");
      }
    } catch (error) {
      console.error("Fill from resume error:", error);
      toast.error("Failed to extract profile from resume");
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.user.name,
          headline: profile.headline,
          bio: profile.bio,
          skills: profile.skills,
          interests: profile.interests,
          education: profile.education,
          experience: profile.experience,
          goals: profile.goals,
          linkedinUrl: profile.linkedinUrl,
          githubUrl: profile.githubUrl,
          portfolioUrl: profile.portfolioUrl,
          otherLinks: profile.otherLinks,
        }),
      });

      if (response.ok) {
        toast.success("Profile saved successfully");
      } else {
        toast.error("Failed to save profile");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && profile && !profile.skills.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()],
      });
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    if (profile) {
      setProfile({
        ...profile,
        skills: profile.skills.filter((s) => s !== skill),
      });
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && profile && !profile.interests.includes(newInterest.trim())) {
      setProfile({
        ...profile,
        interests: [...profile.interests, newInterest.trim()],
      });
      setNewInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    if (profile) {
      setProfile({
        ...profile,
        interests: profile.interests.filter((i) => i !== interest),
      });
    }
  };

  const addEducation = () => {
    if (profile) {
      setProfile({
        ...profile,
        education: [
          ...profile.education,
          { institution: "", degree: "", field: "", year: "" },
        ],
      });
    }
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    if (profile) {
      const newEducation = [...profile.education];
      newEducation[index] = { ...newEducation[index], [field]: value };
      setProfile({ ...profile, education: newEducation });
    }
  };

  const removeEducation = (index: number) => {
    if (profile) {
      setProfile({
        ...profile,
        education: profile.education.filter((_, i) => i !== index),
      });
    }
  };

  const addExperience = () => {
    if (profile) {
      setProfile({
        ...profile,
        experience: [
          ...profile.experience,
          { company: "", role: "", duration: "", description: "" },
        ],
      });
    }
  };

  const updateExperience = (index: number, field: keyof Experience, value: string) => {
    if (profile) {
      const newExperience = [...profile.experience];
      newExperience[index] = { ...newExperience[index], [field]: value };
      setProfile({ ...profile, experience: newExperience });
    }
  };

  const removeExperience = (index: number) => {
    if (profile) {
      setProfile({
        ...profile,
        experience: profile.experience.filter((_, i) => i !== index),
      });
    }
  };

  const calculateCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.headline,
      profile.bio,
      profile.skills.length > 0,
      profile.interests.length > 0,
      profile.education.length > 0,
      profile.experience.length > 0,
      profile.goals,
      profile.linkedinUrl || profile.githubUrl || profile.portfolioUrl,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load profile</p>
        <Button onClick={fetchProfile} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
          <p className="text-muted-foreground">
            Complete your profile to generate better personalized emails
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={documents.length === 0}>
                <Sparkles className="mr-2 h-4 w-4" />
                Fill from Resume
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Fill Profile from Resume</DialogTitle>
                <DialogDescription>
                  Select a document to automatically extract profile information using AI.
                  Make sure the document has been processed (text extracted).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents with extracted text found. Please upload a resume in the Documents section first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => handleFillFromResume(doc.id)}
                        disabled={extracting}
                        className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50"
                      >
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type}</p>
                        </div>
                        {extracting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Completion Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={calculateCompletion()} className="flex-1" />
            <span className="text-sm font-medium">{calculateCompletion()}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Your personal details and headline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.user.name || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    user: { ...profile.user, name: e.target.value },
                  })
                }
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.user.email} disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline</Label>
            <Input
              id="headline"
              value={profile.headline || ""}
              onChange={(e) =>
                setProfile({ ...profile, headline: e.target.value })
              }
              placeholder="Software Engineer | ML Researcher | Open Source Contributor"
            />
            <p className="text-xs text-muted-foreground">
              A brief description of your professional identity
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself, your background, and what drives you..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills & Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Skills & Interests
          </CardTitle>
          <CardDescription>
            Add your skills and areas of interest
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addSkill()}
                placeholder="Add a skill"
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="icon" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Interests</Label>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <Badge key={interest} variant="outline" className="gap-1">
                  {interest}
                  <button
                    onClick={() => removeInterest(interest)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addInterest()}
                placeholder="Add an interest"
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="icon" onClick={addInterest}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Education
          </CardTitle>
          <CardDescription>Your educational background</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.education.map((edu, index) => (
            <div key={index} className="space-y-4 p-4 border rounded-lg relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => removeEducation(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Input
                    value={edu.institution}
                    onChange={(e) =>
                      updateEducation(index, "institution", e.target.value)
                    }
                    placeholder="Stanford University"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Degree</Label>
                  <Input
                    value={edu.degree}
                    onChange={(e) =>
                      updateEducation(index, "degree", e.target.value)
                    }
                    placeholder="Bachelor's, Master's, PhD"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Field of Study</Label>
                  <Input
                    value={edu.field}
                    onChange={(e) =>
                      updateEducation(index, "field", e.target.value)
                    }
                    placeholder="Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    value={edu.year}
                    onChange={(e) =>
                      updateEducation(index, "year", e.target.value)
                    }
                    placeholder="2020 - 2024"
                  />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addEducation}>
            <Plus className="mr-2 h-4 w-4" />
            Add Education
          </Button>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Experience
          </CardTitle>
          <CardDescription>Your work experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.experience.map((exp, index) => (
            <div key={index} className="space-y-4 p-4 border rounded-lg relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => removeExperience(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={exp.company}
                    onChange={(e) =>
                      updateExperience(index, "company", e.target.value)
                    }
                    placeholder="Google"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={exp.role}
                    onChange={(e) =>
                      updateExperience(index, "role", e.target.value)
                    }
                    placeholder="Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    value={exp.duration}
                    onChange={(e) =>
                      updateExperience(index, "duration", e.target.value)
                    }
                    placeholder="Jan 2022 - Present"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={exp.description}
                  onChange={(e) =>
                    updateExperience(index, "description", e.target.value)
                  }
                  placeholder="Describe your responsibilities and achievements..."
                  rows={3}
                />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addExperience}>
            <Plus className="mr-2 h-4 w-4" />
            Add Experience
          </Button>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals
          </CardTitle>
          <CardDescription>
            What are you looking for? (jobs, research opportunities, mentorship, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={profile.goals || ""}
            onChange={(e) => setProfile({ ...profile, goals: e.target.value })}
            placeholder="I'm currently seeking full-time software engineering positions at innovative tech companies. I'm particularly interested in roles involving machine learning and distributed systems..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Links
          </CardTitle>
          <CardDescription>Your professional profiles and portfolio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                value={profile.linkedinUrl || ""}
                onChange={(e) =>
                  setProfile({ ...profile, linkedinUrl: e.target.value })
                }
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub URL</Label>
              <Input
                id="github"
                value={profile.githubUrl || ""}
                onChange={(e) =>
                  setProfile({ ...profile, githubUrl: e.target.value })
                }
                placeholder="https://github.com/yourusername"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio URL</Label>
            <Input
              id="portfolio"
              value={profile.portfolioUrl || ""}
              onChange={(e) =>
                setProfile({ ...profile, portfolioUrl: e.target.value })
              }
              placeholder="https://yourportfolio.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save All Changes
        </Button>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
