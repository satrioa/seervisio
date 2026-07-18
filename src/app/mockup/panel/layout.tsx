import React from "react";
import { PanelLayoutClient } from "./panel-layout-client";
import { MockupInteractionGuard } from "./mockup-interaction-guard";

export default function MockPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-mockup-panel
      className="dark h-dvh bg-sidebar text-sidebar-foreground"
    >
      <MockupInteractionGuard />
      <PanelLayoutClient
        brandSlug="mockup"
        brandId={1}
        brandName="Toko Servis Demo"
        brandLogoUrl={null}
        branches={[
          { id: "1", name: "Toko Pusat" },
          { id: "2", name: "Cabang Margonda" },
        ]}
        initialBranchId="1"
        role="ADMIN"
        canAccessAllBranches={true}
        authUserId="mock-auth-user-id"
        activeOperatorId={null}
        activeOperatorName={null}
        userName="Demo User"
        userEmail="demo@seervisio.com"
        userAvatarUrl={null}
        isImpersonating={false}
        profileId="mock-profile-id"
        onboardingCompleted={true}
        onboardingCompletedTasks={[]}
        activeLicense={{
          status: "active",
          expires_at: null,
          is_trial: false,
        }}
        aiCommandCenterEnabled={false}
        baseHref="/mockup/panel"
      >
        {children}
      </PanelLayoutClient>
    </div>
  );
}
