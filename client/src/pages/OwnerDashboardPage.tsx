import React from "react";
import { useUser } from "@/hooks/use-user";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Shield } from "lucide-react";
import { OwnerDashboard } from "@/components/owner/OwnerDashboard";

export default function OwnerDashboardPage() {
  const { user, isLoading, isOwner } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#C1FF72]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Alert className="max-w-md border-red-800 bg-red-900/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            Please log in to access the owner dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Alert className="max-w-md border-red-800 bg-red-900/20">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            Access denied. Owner privileges required to view this dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <OwnerDashboard />;
}
