import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import {
  SettingsSection,
  SettingsFormSection,
  SettingsGroup,
  SettingsListItem,
  SettingsToggleItem,
  SettingsSuccessMessage,
} from "@/components/ui/settings-section";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { SettingsBreadcrumb } from "@/components/ui/breadcrumb";
import {
  SettingsInput,
  SettingsPasswordInput,
  SettingsSelect,
  SettingsSwitch,
  SettingsFileUpload,
  SettingsDangerZone,
} from "@/components/ui/settings-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  User,
  Settings as SettingsIcon,
  Bell,
  Shield,
  CreditCard,
  Palette,
  Globe,
  Clock,
  Key,
  Download,
  Upload,
  Trash2,
  Eye,
  Monitor,
  Moon,
  Sun,
  Smartphone,
  Mail,
  Volume2,
  VolumeX,
  Database,
  Link,
  FileText,
  AlertTriangle,
  Check,
  Home,
} from "lucide-react";

interface UserSettings {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar: string;
  };
  preferences: {
    theme: "light" | "dark" | "system";
    layout: "compact" | "expanded";
  };
  notifications: {
    email: {
      billing: boolean;
      leadAlerts: boolean;
      weeklyReports: boolean;
    };
  };
  security: {
    loginNotifications: boolean;
  };
}

const defaultSettings: UserSettings = {
  profile: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatar: "",
  },
  preferences: {
    theme: "dark",
    layout: "expanded",
  },
  notifications: {
    email: {
      billing: true,
      leadAlerts: true,
      weeklyReports: false,
    },
  },
  security: {
    loginNotifications: true,
  },
};

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("profile");
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/sign-in");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Load user settings
  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/user/settings"],
    queryFn: async () => {
      const response = await fetch("/api/user/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Update settings when data is loaded
  React.useEffect(() => {
    if (userSettings) {
      setSettings({ ...defaultSettings, ...userSettings });
    }
  }, [userSettings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) throw new Error("Failed to save settings");
      return response.json();
    },
    onSuccess: () => {
      setHasChanges(false);
      setSuccessMessage("Settings saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
    },
  });

  const updateSettings = (section: keyof UserSettings, updates: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleReset = () => {
    setSettings(userSettings || defaultSettings);
    setHasChanges(false);
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-dashboard-bg-primary flex items-center justify-center">
        <div className="text-center text-dashboard-text-primary">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dashboard-primary mx-auto mb-4"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  const navigationSections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "preferences", label: "Preferences", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-dashboard-bg-primary settings-page-container">
      <DashboardHeader
        title="ARTIVANCE"
        subtitle="Settings & Preferences"
        showNotifications={true}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20">
        {/* Breadcrumb Navigation - Positioned at Previous Location */}
        <div className="mb-6">
          <SettingsBreadcrumb />
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4">
            <SettingsSuccessMessage
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Settings Navigation - Apple-style compact sidebar */}
          <div className="lg:col-span-1">
            <div className="relative rounded-lg sticky top-24">
              <GlowingEffect
                blur={0}
                spread={15}
                proximity={120}
                inactiveZone={0.85}
                movementDuration={2.8}
                borderWidth={1}
                glow={true}
                disabled={false}
                className="opacity-80 rounded-lg"
              />
              <div className="apple-compact-section bg-dashboard-bg-secondary/35 rounded-lg border border-dashboard-border-primary/60 settings-navigation-panel relative">
                <div className="p-3 border-b border-dashboard-border-primary/60">
                  <h3 className="apple-compact-title flex items-center space-x-2">
                    <SettingsIcon className="apple-compact-icon" />
                    <span>Settings</span>
                  </h3>
                  <p className="apple-compact-description mt-1">
                    Manage your account preferences
                  </p>
                </div>
                <nav className="p-2 space-y-1">
                  {navigationSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center space-x-2 apple-compact-nav rounded-md text-left apple-transition-fast ${
                          activeSection === section.id
                            ? "bg-dashboard-primary text-white"
                            : "text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                        }`}
                      >
                        <Icon className="apple-compact-icon" />
                        <span className="apple-compact">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          {/* Settings Content - Apple-style compact layout */}
          <div className="lg:col-span-3 space-y-4 settings-content-panel">
            {/* Profile Settings */}
            {activeSection === "profile" && (
              <div className="apple-static-content">
                <SettingsFormSection
                  title="Profile Information"
                  description="Update your personal information and profile picture"
                  icon={User}
                  onSave={handleSave}
                  onReset={handleReset}
                  saving={saveSettingsMutation.isPending}
                  hasChanges={hasChanges}
                >
                  <SettingsGroup title="Personal Information">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SettingsInput
                        label="First Name"
                        value={settings.profile.firstName}
                        onChange={(e) =>
                          updateSettings("profile", {
                            firstName: e.target.value,
                          })
                        }
                        required
                        tooltip="Your first name as it appears on your account"
                      />
                      <SettingsInput
                        label="Last Name"
                        value={settings.profile.lastName}
                        onChange={(e) =>
                          updateSettings("profile", {
                            lastName: e.target.value,
                          })
                        }
                        required
                        tooltip="Your last name as it appears on your account"
                      />
                    </div>
                    <SettingsInput
                      label="Email Address"
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) =>
                        updateSettings("profile", { email: e.target.value })
                      }
                      required
                      tooltip="Your email address for account notifications and login"
                    />
                    <SettingsInput
                      label="Phone Number"
                      type="tel"
                      value={settings.profile.phone}
                      onChange={(e) =>
                        updateSettings("profile", { phone: e.target.value })
                      }
                      tooltip="Optional phone number for account recovery"
                    />
                  </SettingsGroup>
                </SettingsFormSection>
              </div>
            )}

            {/* Preferences Settings */}
            {activeSection === "preferences" && (
              <div className="apple-static-content">
                <SettingsFormSection
                  title="Dashboard Preferences"
                  description="Customize your dashboard appearance and behavior"
                  icon={Palette}
                  onSave={handleSave}
                  onReset={handleReset}
                  saving={saveSettingsMutation.isPending}
                  hasChanges={hasChanges}
                >
                  <SettingsGroup title="Appearance">
                    <SettingsSelect
                      label="Theme"
                      description="Choose your preferred color theme"
                      value={settings.preferences.theme}
                      onValueChange={(value) =>
                        updateSettings("preferences", { theme: value })
                      }
                      options={[
                        { value: "light", label: "Light" },
                        { value: "dark", label: "Dark" },
                        { value: "system", label: "System" },
                      ]}
                      tooltip="System theme follows your device's theme setting"
                    />
                    <SettingsSelect
                      label="Dashboard Layout"
                      description="Choose between compact or expanded layout"
                      value={settings.preferences.layout}
                      onValueChange={(value) =>
                        updateSettings("preferences", { layout: value })
                      }
                      options={[
                        { value: "compact", label: "Compact" },
                        { value: "expanded", label: "Expanded" },
                      ]}
                      tooltip="Compact layout shows more information in less space"
                    />
                  </SettingsGroup>
                </SettingsFormSection>
              </div>
            )}

            {/* Notifications Settings */}
            {activeSection === "notifications" && (
              <div className="apple-static-content">
                <SettingsFormSection
                  title="Notification Preferences"
                  description="Control how and when you receive notifications"
                  icon={Bell}
                  onSave={handleSave}
                  onReset={handleReset}
                  saving={saveSettingsMutation.isPending}
                  hasChanges={hasChanges}
                >
                  <SettingsGroup title="Email Notifications">
                    <SettingsToggleItem
                      title="Billing Notifications"
                      description="Receive emails about billing, payments, and subscription changes"
                      checked={settings.notifications.email.billing}
                      onCheckedChange={(checked) =>
                        updateSettings("notifications", {
                          email: {
                            ...settings.notifications.email,
                            billing: checked,
                          },
                        })
                      }
                    />
                    <SettingsToggleItem
                      title="Lead Alerts"
                      description="Receive emails when new leads are generated"
                      checked={settings.notifications.email.leadAlerts}
                      onCheckedChange={(checked) =>
                        updateSettings("notifications", {
                          email: {
                            ...settings.notifications.email,
                            leadAlerts: checked,
                          },
                        })
                      }
                    />
                    <SettingsToggleItem
                      title="Weekly Reports"
                      description="Receive weekly summary reports of your lead generation performance"
                      checked={settings.notifications.email.weeklyReports}
                      onCheckedChange={(checked) =>
                        updateSettings("notifications", {
                          email: {
                            ...settings.notifications.email,
                            weeklyReports: checked,
                          },
                        })
                      }
                    />
                  </SettingsGroup>
                </SettingsFormSection>
              </div>
            )}

            {/* Billing Settings */}
            {activeSection === "billing" && (
              <div className="apple-static-content">
                <SettingsSection
                  title="Billing & Subscription"
                  description="Manage your subscription and payment methods"
                  icon={CreditCard}
                  badge={{ text: "Professional", variant: "default" }}
                >
                  <SettingsGroup title="Subscription">
                    <div className="bg-dashboard-bg-tertiary rounded-lg p-3 border border-dashboard-border-primary">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-base font-semibold text-dashboard-text-primary">
                            Professional Plan
                          </h3>
                          <p className="text-sm text-dashboard-text-secondary">
                            $49.99/month • Active
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                          >
                            Change
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-settings-danger text-settings-danger hover:bg-settings-danger/10"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <SettingsListItem
                        title="PayPal"
                        description="••••@example.com"
                        badge={{ text: "Primary", variant: "default" }}
                        action={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-dashboard-text-secondary hover:text-dashboard-text-primary"
                          >
                            Edit
                          </Button>
                        }
                      />
                    </div>
                  </SettingsGroup>
                </SettingsSection>
              </div>
            )}

            {/* Security Settings */}
            {activeSection === "security" && (
              <div className="apple-static-content">
                <SettingsFormSection
                  title="Security & Privacy"
                  description="Manage your account security settings"
                  icon={Shield}
                  onSave={handleSave}
                  onReset={handleReset}
                  saving={saveSettingsMutation.isPending}
                  hasChanges={hasChanges}
                >
                  <SettingsGroup title="Password">
                    <SettingsPasswordInput
                      label="Current Password"
                      placeholder="Enter current password"
                      tooltip="Required to change your password"
                    />
                    <SettingsPasswordInput
                      label="New Password"
                      placeholder="Enter new password"
                      tooltip="Password must be at least 8 characters long"
                    />
                    <SettingsPasswordInput
                      label="Confirm New Password"
                      placeholder="Confirm new password"
                    />
                  </SettingsGroup>

                  <Separator className="bg-settings-divider" />

                  <SettingsGroup title="Account Security">
                    <SettingsToggleItem
                      title="Login Notifications"
                      description="Receive email notifications for new login attempts"
                      checked={settings.security.loginNotifications}
                      onCheckedChange={(checked) =>
                        updateSettings("security", {
                          loginNotifications: checked,
                        })
                      }
                    />
                  </SettingsGroup>
                </SettingsFormSection>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
