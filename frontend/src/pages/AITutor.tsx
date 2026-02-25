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
import { QuotaIndicator } from "@/components/pricing/QuotaIndicator";
import { Loader2, Send, MessageCircle, Crown, Lock } from "lucide-react";

type Quota = { used: number; limit: number; tier: string; allowed: boolean; reason?: string };
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
    onError: (err: any) => {
      if (err?.upgradeRequired) {
        toast.error("AI Tutor faqat Pro rejada mavjud. Tariflar sahifasidan o'ting.");
      } else {
        toast.error(err instanceof Error ? err.message : "AI tutor javob bermadi");
      }
    },
  });

  const items = history?.items ?? [];
  const isProUser = quota?.tier === "PRO";
  const hasAccess = quota?.allowed ?? false;
  const canSend = hasAccess && (quota?.used ?? 0) < (quota?.limit ?? 0) && message.trim().length > 0;

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

        {/* Quota Card */}
        <Card className="rounded-xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
              Oylik limit
            </CardTitle>
            <CardContent className="pt-0">
              {quotaLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : isProUser ? (
                <QuotaIndicator
                  label="AI Tutor xabarlari"
                  used={quota?.used ?? 0}
                  limit={quota?.limit ?? 0}
                  color="amber"
                  showBar
                />
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Lock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      AI Tutor — faqat Pro rejada
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pro obunada oyiga 50 ta xabar yuborishingiz mumkin
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </CardHeader>
        </Card>

        {/* Chat Area */}
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card shadow-sm">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !hasAccess ? (
              // Non-Pro users see upgrade prompt
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-foreground">AI Tutor — Pro xizmati</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    AI Tutor arab tili grammatikasi, so'z boyligi va imtihon tayyorgarligida yordam beradi.
                    Foydalanish uchun Pro rejaga o'ting.
                  </p>
                </div>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:from-amber-600 hover:to-orange-600 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25"
                >
                  <Crown className="h-4 w-4" />
                  Pro rejaga o'tish
                </Link>
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

          {/* Input Area */}
          <div className="border-t border-border bg-muted/20 p-4">
            {!hasAccess ? (
              <p className="py-2 text-center text-sm text-muted-foreground">
                AI Tutor dan foydalanish uchun{" "}
                <Link to="/pricing" className="font-medium text-primary underline hover:no-underline">
                  Pro rejaga o'ting
                </Link>
                .
              </p>
            ) : (quota?.used ?? 0) >= (quota?.limit ?? 0) ? (
              <p className="py-2 text-center text-sm text-amber-600 dark:text-amber-400 font-medium">
                Oylik AI Tutor limiti tugadi ({quota?.limit}/{quota?.limit}).
                Keyingi oy boshida yangilanadi.
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
