/**
 * useAccessControl – Client-side hook for checking user access levels.
 *
 * Uses React Query to fetch and cache the user's access status.
 * Provides helper functions for checking access to features.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { AccessStatus } from "@/pages/PricingPage";

export function useAccessControl() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
    const queryClient = useQueryClient();

    const { data: status, isLoading, error } = useQuery<AccessStatus>({
        queryKey: ["access-status"],
        queryFn: () => api<AccessStatus>("/access/status"),
        enabled: isAuthenticated,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const recordUsage = useMutation({
        mutationFn: (type: "mock" | "writing" | "speaking") =>
            api("/access/usage/record", { method: "POST", body: { type } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["access-status"] });
        },
    });

    return {
        status,
        isLoading,
        error,
        planType: status?.planType ?? "free",
        isProUser: status?.planType === "pro",
        isStandardUser: status?.planType === "standard",
        isFreeUser: status?.planType === "free" || !status,

        // Access checks
        canAccessFullSarf: status?.access.fullSarf ?? false,
        canStartMock: status?.access.mockExam ?? false,
        canUseWritingAI: status?.access.writingAI ?? false,
        canUseSpeakingAI: status?.access.speakingAI ?? false,
        canUseAITutor: status?.access.aiTutor ?? false,

        // Usage info
        mockUsage: status?.usage.mock ?? { used: 0, limit: 0 },
        writingUsage: status?.usage.writing ?? { used: 0, limit: 0 },
        speakingUsage: status?.usage.speaking ?? { used: 0, limit: 0 },
        aiTutorUsage: status?.usage.aiTutor ?? { used: 0, limit: 0 },

        // Purchase info
        mockPurchases: status?.purchases.mockExam ?? { available: 0, expiresAt: null },

        // Subscription info
        subscription: status?.subscription ?? { active: false, expiresAt: null },

        // Actions
        recordUsage: recordUsage.mutate,
        isRecordingUsage: recordUsage.isPending,

        // Refresh
        refetch: () => queryClient.invalidateQueries({ queryKey: ["access-status"] }),
    };
}
