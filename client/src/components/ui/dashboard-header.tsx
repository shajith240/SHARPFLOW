import { useState } from "react";
import { Button } from "./button";
import {
  LogOut,
  Settings,
  LayoutDashboard,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useLocation } from "wouter";
import { useDashboardScroll } from "../../hooks/use-dashboard-scroll";
import { ProfileImage } from "./profile-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { NotificationCenter } from "../notifications/NotificationCenter";

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
  showNotifications?: boolean;
}

export function DashboardHeader({
  title = "SharpFlow Dashboard",
  subtitle,
  className = "",
  showNotifications = false,
}: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  // Use premium navbar auto-hide hook with professional UX behavior
  const { headerVisible, isScrolled, isAtTop } = useDashboardScroll({
    threshold: 10,
    hideOnScrollDown: true,
  });

  // Determine current page for dynamic navigation
  const isOnSettingsPage = location.includes("/settings");
  const isOnDashboardPage =
    location === "/dashboard" || location === "/dashboard/";

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 ${
        isAtTop
          ? "bg-dashboard-bg-primary/95 backdrop-blur-sm border-b border-dashboard-border-primary"
          : isScrolled
          ? "bg-dashboard-bg-primary/90 backdrop-blur-md border-b border-dashboard-border-primary/50"
          : "bg-transparent border-none"
      } ${className}`}
      style={{
        transform: headerVisible
          ? "translate3d(0, 0, 0)"
          : "translate3d(0, -100%, 0)",
        transition: "transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        perspective: "1000px",
        WebkitPerspective: "1000px",
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo Section */}
          <div className="flex items-center">
            <img
              src="/navbar_logo.svg"
              alt="SharpFlow"
              className="h-14 w-auto lg:h-16"
            />
          </div>

          {/* User Profile Section */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Notification Center */}
            {showNotifications && <NotificationCenter />}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-3 px-3 py-2 apple-transition-fast hover:bg-dashboard-interactive-hover rounded-lg"
                >
                  <ProfileImage
                    size="sm"
                    className="h-8 w-8"
                    userName={
                      user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.firstName
                    }
                    userEmail={user?.email}
                  />
                  <div className="text-left">
                    <p className="text-sm font-medium text-dashboard-text-primary">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.firstName || "User"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-dashboard-text-secondary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-dashboard-bg-tertiary border-dashboard-border-primary apple-transition-fast"
              >
                {/* Dynamic navigation based on current page */}
                {isOnSettingsPage ? (
                  <DropdownMenuItem
                    onClick={() => {
                      console.log("🏠 [HEADER] Navigating to dashboard");
                      window.location.href = "/dashboard";
                    }}
                    className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover cursor-pointer apple-transition-fast"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      console.log("⚙️ [HEADER] Navigating to settings");
                      window.location.href = "/dashboard/settings";
                    }}
                    className="text-dashboard-text-primary hover:bg-dashboard-interactive-hover cursor-pointer apple-transition-fast"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-dashboard-error hover:bg-dashboard-error/10 cursor-pointer apple-transition-fast"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button and Notifications */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Notification Center */}
            {showNotifications && <NotificationCenter />}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-interactive-hover apple-transition-fast"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-dashboard-border-primary mt-2 pt-4 pb-4 apple-static-content">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3 px-2">
                <ProfileImage
                  size="sm"
                  className="h-10 w-10"
                  userName={
                    user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.firstName
                  }
                  userEmail={user?.email}
                />
                <div>
                  <p className="text-sm font-medium text-dashboard-text-primary">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.firstName || "User"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                {/* Dynamic navigation based on current page */}
                {isOnSettingsPage ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      console.log("🏠 [MOBILE] Navigating to dashboard");
                      setMobileMenuOpen(false);
                      window.location.href = "/dashboard";
                    }}
                    className="justify-start text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-interactive-hover apple-transition-fast"
                  >
                    <LayoutDashboard className="mr-3 h-5 w-5" />
                    Dashboard
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      console.log("⚙️ [MOBILE] Navigating to settings");
                      setMobileMenuOpen(false);
                      window.location.href = "/dashboard/settings";
                    }}
                    className="justify-start text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-interactive-hover apple-transition-fast"
                  >
                    <Settings className="mr-3 h-5 w-5" />
                    Settings
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="justify-start text-dashboard-error hover:bg-dashboard-error/10 apple-transition-fast"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
