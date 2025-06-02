import React from "react";
import { SubscriptionPlan } from "@/types/lead-generation";
import LeadsDashboard from "./LeadsDashboard";

interface LeadGenerationDashboardProps {
  userPlan: SubscriptionPlan;
  className?: string;
}

export function LeadGenerationDashboard({
  userPlan,
  className = "",
}: LeadGenerationDashboardProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Clean Lead Generation Dashboard - Only Essential Features */}
      <LeadsDashboard />
    </div>
  );
}
