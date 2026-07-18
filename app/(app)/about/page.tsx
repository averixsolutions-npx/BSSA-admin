"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { aboutService } from "@/lib/services/about";
import { ApiCallError } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "mission", label: "Mission" },
  { key: "vision", label: "Vision" },
  { key: "goals", label: "Goals" },
  { key: "history", label: "History" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("mission");

  return (
    <div className="space-y-6">
      <PageHeader title="About content" description="Mission, vision, goals and history shown on the public About page." />

      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AboutEditor key={activeTab} contentKey={activeTab} />
    </div>
  );
}

function AboutEditor({ contentKey }: { contentKey: string }) {
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["about"] }); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof ApiCallError ? e.message : "Failed to save"),
  });

  if (isLoading || !loaded) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4 max-w-3xl">
      <RichTextEditor value={html} onChange={setHtml} placeholder={`Write the ${contentKey} content…`} />
      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save {contentKey}
      </Button>
    </div>
  );
}
