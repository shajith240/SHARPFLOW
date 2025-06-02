import React, { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { Switch } from "./switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  X,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

interface SettingsFormFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  success?: string;
  children: React.ReactNode;
  tooltip?: string;
  className?: string;
}

export function SettingsFormField({
  label,
  description,
  required,
  error,
  success,
  children,
  tooltip,
  className,
}: SettingsFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center space-x-2">
        <Label className="text-dashboard-text-primary font-medium">
          {label}
          {required && <span className="text-settings-danger ml-1">*</span>}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-dashboard-text-muted cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-dashboard-bg-tertiary border-dashboard-border-primary">
                <p className="text-dashboard-text-primary max-w-xs">
                  {tooltip}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {description && (
        <p className="text-sm text-dashboard-text-secondary">{description}</p>
      )}

      {children}

      {error && (
        <div className="flex items-center space-x-2 text-settings-danger apple-compact apple-fade-in">
          <AlertTriangle className="apple-compact-icon" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 text-settings-success apple-compact apple-fade-in">
          <Check className="apple-compact-icon" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}

interface SettingsInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
  success?: string;
  tooltip?: string;
}

export function SettingsInput({
  label,
  description,
  error,
  success,
  tooltip,
  className,
  ...props
}: SettingsInputProps) {
  return (
    <SettingsFormField
      label={label}
      description={description}
      error={error}
      success={success}
      tooltip={tooltip}
      required={props.required}
    >
      <Input
        className={cn(
          "bg-settings-input border-dashboard-border-primary text-dashboard-text-primary",
          "focus:border-dashboard-primary focus:ring-dashboard-primary",
          error && "border-settings-danger focus:border-settings-danger",
          success && "border-settings-success focus:border-settings-success",
          className
        )}
        {...props}
      />
    </SettingsFormField>
  );
}

interface SettingsPasswordInputProps extends Omit<SettingsInputProps, "type"> {
  showToggle?: boolean;
}

export function SettingsPasswordInput({
  showToggle = true,
  className,
  ...props
}: SettingsPasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SettingsFormField
      label={props.label}
      description={props.description}
      error={props.error}
      success={props.success}
      tooltip={props.tooltip}
      required={props.required}
    >
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={cn(
            "bg-settings-input border-dashboard-border-primary text-dashboard-text-primary pr-10",
            "focus:border-dashboard-primary focus:ring-dashboard-primary",
            props.error &&
              "border-settings-danger focus:border-settings-danger",
            props.success &&
              "border-settings-success focus:border-settings-success",
            className
          )}
          {...props}
        />
        {showToggle && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 text-dashboard-text-muted hover:text-dashboard-text-primary"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </SettingsFormField>
  );
}

interface SettingsTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  description?: string;
  error?: string;
  success?: string;
  tooltip?: string;
}

export function SettingsTextarea({
  label,
  description,
  error,
  success,
  tooltip,
  className,
  ...props
}: SettingsTextareaProps) {
  return (
    <SettingsFormField
      label={label}
      description={description}
      error={error}
      success={success}
      tooltip={tooltip}
      required={props.required}
    >
      <Textarea
        className={cn(
          "bg-settings-input border-dashboard-border-primary text-dashboard-text-primary",
          "focus:border-dashboard-primary focus:ring-dashboard-primary",
          error && "border-settings-danger focus:border-settings-danger",
          success && "border-settings-success focus:border-settings-success",
          className
        )}
        {...props}
      />
    </SettingsFormField>
  );
}

interface SettingsSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  tooltip?: string;
  disabled?: boolean;
}

export function SettingsSwitch({
  label,
  description,
  checked,
  onCheckedChange,
  tooltip,
  disabled,
}: SettingsSwitchProps) {
  return (
    <SettingsFormField
      label={label}
      description={description}
      tooltip={tooltip}
    >
      <div className="flex items-center space-x-2">
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="data-[state=checked]:bg-dashboard-primary"
        />
        <span className="text-sm text-dashboard-text-secondary">
          {checked ? "Enabled" : "Disabled"}
        </span>
      </div>
    </SettingsFormField>
  );
}

interface SettingsSelectProps {
  label: string;
  description?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  tooltip?: string;
  error?: string;
}

export function SettingsSelect({
  label,
  description,
  value,
  onValueChange,
  options,
  placeholder,
  tooltip,
  error,
}: SettingsSelectProps) {
  return (
    <SettingsFormField
      label={label}
      description={description}
      error={error}
      tooltip={tooltip}
    >
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            "bg-settings-input border-dashboard-border-primary text-dashboard-text-primary",
            "focus:border-dashboard-primary focus:ring-dashboard-primary",
            error && "border-settings-danger"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-dashboard-bg-tertiary border-dashboard-border-primary">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsFormField>
  );
}

interface SettingsFileUploadProps {
  label: string;
  description?: string;
  accept?: string;
  onFileSelect: (file: File | null) => void;
  currentFile?: string;
  tooltip?: string;
  error?: string;
  maxSize?: number; // in MB
}

export function SettingsFileUpload({
  label,
  description,
  accept,
  onFileSelect,
  currentFile,
  tooltip,
  error,
  maxSize = 5,
}: SettingsFileUploadProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > maxSize * 1024 * 1024) {
      // Handle file size error
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0] || null;
    if (file && file.size > maxSize * 1024 * 1024) {
      // Handle file size error
      return;
    }
    onFileSelect(file);
  };

  return (
    <SettingsFormField
      label={label}
      description={description}
      error={error}
      tooltip={tooltip}
    >
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragOver
            ? "border-dashboard-primary bg-dashboard-primary/5"
            : "border-dashboard-border-primary hover:border-dashboard-primary/50",
          error && "border-settings-danger"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${label.replace(/\s+/g, "-").toLowerCase()}`}
        />
        <label
          htmlFor={`file-upload-${label.replace(/\s+/g, "-").toLowerCase()}`}
          className="cursor-pointer"
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-dashboard-text-muted" />
          <p className="text-dashboard-text-primary font-medium">
            Drop files here or click to upload
          </p>
          <p className="text-sm text-dashboard-text-secondary mt-1">
            Max file size: {maxSize}MB
          </p>
        </label>

        {currentFile && (
          <div className="mt-4 p-3 bg-dashboard-bg-tertiary rounded-lg flex items-center justify-between">
            <span className="text-sm text-dashboard-text-primary truncate">
              {currentFile}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFileSelect(null)}
              className="text-settings-danger hover:text-settings-danger-hover"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </SettingsFormField>
  );
}

interface SettingsDangerZoneProps {
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void;
  confirmText?: string;
  loading?: boolean;
}

export function SettingsDangerZone({
  title,
  description,
  actionLabel,
  onConfirm,
  confirmText = "I understand the consequences",
  loading = false,
}: SettingsDangerZoneProps) {
  return (
    <div className="border border-settings-danger/30 rounded-lg p-6 bg-settings-danger/5">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-settings-danger mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-dashboard-text-primary mb-2">
            {title}
          </h3>
          <p className="text-dashboard-text-secondary mb-4">{description}</p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="bg-settings-danger hover:bg-settings-danger-hover"
                disabled={loading}
              >
                {loading ? "Processing..." : actionLabel}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-dashboard-bg-tertiary border-dashboard-border-primary">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-dashboard-text-primary">
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-dashboard-text-secondary">
                  This action cannot be undone. {description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-dashboard-bg-secondary border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onConfirm}
                  className="bg-settings-danger hover:bg-settings-danger-hover text-white"
                >
                  {confirmText}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
