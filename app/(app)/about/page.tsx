"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Compass, Flag, History, Loader2, Save, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { aboutService } from "@/lib/services/about";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SectionCard, type SectionTone } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS: {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: SectionTone;
  description: string;
}[] = [
  { key: "mission", label: "Mission", icon: Target, tone: "blue", description: "Why the federation exists." },
  { key: "vision", label: "Vision", icon: Compass, tone: "violet", description: "Where it's heading." },
  { key: "goals", label: "Goals", icon: Flag, tone: "green", description: "What it's working towards." },
  { key: "history", label: "History", icon: History, tone: "amber", description: "How it got here." },
];

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].key);

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="About content"
        description="Mission, vision, goals and history shown on the public About page."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="mt-5">
            <SectionCard title={tab.label} description={tab.description} icon={tab.icon} tone={tab.tone}>
              <AboutEditor contentKey={tab.key} label={tab.label} />
            </SectionCard>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function AboutEditor({ contentKey, label }: { contentKey: string; label: string }) {
  const qc = useQueryClient();
  const [html, setHtml] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["about", contentKey],
    queryFn: async () => {
      try {
        const data = await aboutService.getByKey(contentKey);
        setHtml(data.body);
        setLoaded(true);
        return data;
      } catch {
        setHtml("");
        setLoaded(true);
        return null;
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => aboutService.update(contentKey, html),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["about"] }); toast.success(`${label} saved`); },
    onError: (e) =>
      toast.error(`Couldn't save ${label.toLowerCase()}`, {
        description: e instanceof ApiCallError ? e.message : undefined,
      }),
  });

  if (isLoading || !loaded) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <RichTextEditor value={html} onChange={setHtml} placeholder={`Write the ${contentKey} content…`} />
      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save {contentKey}
      </Button>
    </>
  );
}
