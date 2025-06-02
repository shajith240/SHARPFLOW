import React from "react";
import { DashboardCard } from "./dashboard-card";
import { Button } from "./button";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import { LucideIcon, Save, RotateCcw, Check } from "lucide-react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
}

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  actions,
  badge,
}: SettingsSectionProps) {
  return (
    <div className="relative rounded-lg">
      <DashboardCard
        variant="elevated"
        className={cn(
          "overflow-hidden relative rounded-lg border border-dashboard-border-primary/60 bg-dashboard-bg-secondary/35",
          className
        )}
      >
        <div className="apple-compact-section border-b border-settings-divider">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {Icon && (
                <div className="p-1.5 bg-dashboard-primary/10 rounded-md">
                  <Icon className="apple-compact-icon text-dashboard-primary" />
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="apple-compact-title text-dashboard-text-primary">
                    {title}
                  </h2>
                  {badge && (
                    <Badge
                      variant={badge.variant || "default"}
                      className="text-xs"
                    >
                      {badge.text}
                    </Badge>
                  )}
                </div>
                {description && (
                  <p className="apple-compact-description mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center space-x-2">{actions}</div>
            )}
          </div>
        </div>
        <div className="apple-compact-section">{children}</div>
      </DashboardCard>
    </div>
  );
}

interface SettingsFormSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  onSave?: () => void;
  onReset?: () => void;
  saveLabel?: string;
  resetLabel?: string;
  saving?: boolean;
  hasChanges?: boolean;
  className?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
}

export function SettingsFormSection({
  title,
  description,
  icon,
  children,
  onSave,
  onReset,
  saveLabel = "Save Changes",
  resetLabel = "Reset",
  saving = false,
  hasChanges = false,
  className,
  badge,
}: SettingsFormSectionProps) {
  const actions = (onSave || onReset) && (
    <div className="flex items-center space-x-2">
      {onReset && (
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={saving || !hasChanges}
          className="px-4 py-2 text-sm font-medium rounded-lg border-2 border-dashboard-border-primary text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-interactive-hover hover:border-dashboard-primary/70 disabled:opacity-50 disabled:cursor-not-allowed apple-transition-fast focus:outline-none focus:ring-0"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {resetLabel}
        </Button>
      )}
      {onSave && (
        <Button
          type="button"
          onClick={onSave}
          disabled={saving || !hasChanges}
          className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed apple-transition-fast focus:outline-none focus:ring-0"
          style={{
            backgroundColor: hasChanges && !saving ? "#38B6FF" : "#6B7280",
            borderColor: hasChanges && !saving ? "#38B6FF" : "#6B7280",
          }}
          onMouseEnter={(e) => {
            if (hasChanges && !saving) {
              e.currentTarget.style.backgroundColor = "#2563EB";
              e.currentTarget.style.borderColor = "#2563EB";
            }
          }}
          onMouseLeave={(e) => {
            if (hasChanges && !saving) {
              e.currentTarget.style.backgroundColor = "#38B6FF";
              e.currentTarget.style.borderColor = "#38B6FF";
            }
          }}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full w-4 h-4 border-b-2 border-white mr-2" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              <span>{saveLabel}</span>
            </>
          )}
        </Button>
      )}
    </div>
  );

  return (
    <SettingsSection
      title={title}
      description={description}
      icon={icon}
      actions={actions}
      badge={badge}
      className={className}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave?.();
        }}
        className="space-y-4"
      >
        {children}
      </form>
    </SettingsSection>
  );
}

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsGroup({
  title,
  description,
  children,
  className,
}: SettingsGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {(title || description) && (
        <div className="space-y-0.5">
          {title && (
            <h3 className="apple-compact-title text-dashboard-text-primary">
              {title}
            </h3>
          )}
          {description && (
            <p className="apple-compact-description">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface SettingsListItemProps {
  title: string;
  description?: string;
  value?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function SettingsListItem({
  title,
  description,
  value,
  badge,
  action,
  onClick,
  className,
}: SettingsListItemProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-lg border border-dashboard-border-primary/60 bg-dashboard-bg-secondary/35",
        "flex items-center justify-between",
        onClick &&
          "hover:bg-dashboard-interactive-hover cursor-pointer apple-hover",
        className
      )}
    >
      <div className="flex-1 text-left">
        <div className="flex items-center space-x-2">
          <h4 className="apple-compact font-medium text-dashboard-text-primary">
            {title}
          </h4>
          {badge && (
            <Badge variant={badge.variant || "default"} className="text-xs">
              {badge.text}
            </Badge>
          )}
        </div>
        {description && (
          <p className="apple-compact-description mt-0.5">{description}</p>
        )}
        {value && (
          <p className="apple-compact text-dashboard-text-accent mt-0.5 font-mono">
            {value}
          </p>
        )}
      </div>
      {action && <div className="ml-3">{action}</div>}
    </Component>
  );
}

interface SettingsToggleItemProps {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function SettingsToggleItem({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: SettingsToggleItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border border-dashboard-border-primary/60 bg-dashboard-bg-secondary/35",
        className
      )}
    >
      <div className="flex-1">
        <h4 className="apple-compact font-medium text-dashboard-text-primary">
          {title}
        </h4>
        {description && (
          <p className="apple-compact-description mt-0.5">{description}</p>
        )}
      </div>
      <div className="ml-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            disabled={disabled}
            className="sr-only"
          />
          <div
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-opacity duration-200",
              checked ? "bg-dashboard-primary" : "bg-dashboard-border-primary",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white transition-all duration-200",
                checked ? "translate-x-4.5" : "translate-x-0.5"
              )}
            />
          </div>
        </label>
      </div>
    </div>
  );
}

interface SettingsSuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  duration?: number;
}

export function SettingsSuccessMessage({
  message,
  onDismiss,
  autoHide = true,
  duration = 3000,
}: SettingsSuccessMessageProps) {
  React.useEffect(() => {
    if (autoHide && onDismiss) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onDismiss]);

  return (
    <div className="flex items-center space-x-3 p-3 bg-settings-success/10 border border-settings-success/30 rounded-lg apple-fade-in">
      <Check className="apple-compact-icon text-settings-success" />
      <span className="apple-compact text-dashboard-text-primary font-medium">
        {message}
      </span>
      {onDismiss && (
        <Button
          variant="ghost"
          onClick={onDismiss}
          className="apple-compact-button ml-auto text-dashboard-text-muted hover:text-dashboard-text-primary apple-hover"
        >
          ×
        </Button>
      )}
    </div>
  );
}
