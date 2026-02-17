import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/app/AppLayout";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";
import { Loader2, Send, MessageCircle } from "lucide-react";

type Quota = { used: number; limit: number; tier: string };
type HistoryItem = { id: string; questionAsked: string; aiResponse: string; createdAt: string };

export function AITutor() {
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: quota, isLoading: quotaLoading } = useQuery({
    queryKey: ["ai-tutor-quota"],
    queryFn: () => api<Quota>("/ai-tutor/quota"),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["ai-tutor-history"],
    queryFn: () =>
      api<{ items: HistoryItem[]; total: number; page: number; totalPages: number }>(
        "/ai-tutor/history?pageSize=30"
      ),
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      api<{ aiResponse: string; used: number; limit: number }>("/ai-tutor/chat", {
        method: "POST",
        body: { message: text },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-tutor-history"] });
      queryClient.invalidateQueries({ queryKey: ["ai-tutor-quota"] });
      setMessage("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "AI tutor javob bermadi");
    },
  });

  const items = history?.items ?? [];
  const canSend =
    (quota?.limit ?? 0) > (quota?.used ?? 0) && message.trim().length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length, sendMutation.isSuccess]);

  const handleSend = () => {
    const text = message.trim();
    if (!text || !canSend) return;
    sendMutation.mutate(text);
  };

  return (
    <AppLayout maxWidth="max-w-2xl">
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="AI Tutor – Arab tili"
          subtitle="Savolingizni yozing, CEFR darajangizga mos javob olasiz (grammatika, so'z boyligi, imtihon tayyorgarlik)."
        />

        <Card className="rounded-xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
              Oylik limit
            </CardTitle>
            <CardContent className="pt-0">
              {quotaLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  <strong>{quota?.used ?? 0}</strong> / <strong>{quota?.limit ?? 0}</strong>
                  {quota?.tier === "FREE" && quota?.limit === 0 && (
                    <span className="ml-2 text-destructive">
                      AI Tutor Premium yoki Intensive tarifda ishlatiladi.
                    </span>
                  )}
                </p>
              )}
            </CardContent>
          </CardHeader>
        </Card>

        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card shadow-sm">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 && !sendMutation.isPending ? (
              <p className="py-8 text-center text-muted-foreground">
                Savol bering – AI tutor javob beradi.
              </p>
            ) : (
              <>
                {items.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-end">
                      <div
                        className="max-w-[85%] rounded-xl bg-primary/10 px-4 py-2.5 text-sm text-right"
                        dir="auto"
                      >
                        {item.questionAsked}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div
                        className="max-w-[85%] rounded-xl bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap"
                        dir="auto"
                      >
                        {item.aiResponse}
                      </div>
                    </div>
                  </div>
                ))}
                {sendMutation.isPending && (
                  <div className="flex justify-end">
                    <div className="flex max-w-[85%] items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Javob yozilmoqda…
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          <div className="border-t border-border bg-muted/20 p-4">
            {quota?.tier === "FREE" && quota?.limit === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">
                AI Tutor dan foydalanish uchun{" "}
                <Link to="/pricing" className="font-medium text-primary underline hover:no-underline">
                  Premium yoki Intensive tarifga o'ting
                </Link>
                .
              </p>
            ) : (
              <div className="flex gap-2">
                <textarea
                  className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  placeholder="Savol yozing…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    (e.preventDefault(), handleSend())
                  }
                  rows={2}
                />
                <Button
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl"
                  onClick={handleSend}
                  disabled={!canSend || sendMutation.isPending}
                  aria-label="Yuborish"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
