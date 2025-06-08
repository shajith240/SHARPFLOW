import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning" | "success";
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: "text-blue-400",
    confirmButtonVariant: "default" as const,
  },
  destructive: {
    icon: Trash2,
    iconColor: "text-red-400",
    confirmButtonVariant: "destructive" as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-400",
    confirmButtonVariant: "default" as const,
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-green-400",
    confirmButtonVariant: "default" as const,
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmationDialogProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#0A0A0A] border-white/20 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                variant === "destructive" && "bg-red-400/10",
                variant === "warning" && "bg-yellow-400/10",
                variant === "success" && "bg-green-400/10",
                variant === "default" && "bg-blue-400/10"
              )}
            >
              <IconComponent className={cn("h-5 w-5", config.iconColor)} />
            </div>
            <AlertDialogTitle className="text-[#F5F5F5] text-lg font-semibold">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-400 text-sm leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 mt-6">
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="border-white/20 text-gray-300 hover:bg-white/5 hover:text-white apple-transition-fast"
            >
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={config.confirmButtonVariant}
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                "apple-transition-fast",
                variant === "destructive" &&
                  "bg-red-500 hover:bg-red-600 text-white",
                variant === "warning" &&
                  "bg-yellow-500 hover:bg-yellow-600 text-black",
                variant === "success" &&
                  "bg-green-500 hover:bg-green-600 text-white",
                variant === "default" &&
                  "bg-[#38B6FF] hover:bg-[#38B6FF]/80 text-white"
              )}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                confirmText
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmationDialog;
