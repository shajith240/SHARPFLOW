import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import {
  User,
  LogOut,
  Home,
  FileText,
  MessageSquare,
  CreditCard,
  Crown,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";
import { MobileSidebar } from "./ui/mobile-sidebar";
import { ProfileImage } from "./ui/profile-image";
import { useScrollPosition } from "../hooks/use-scroll-position";

export default function Header() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Use scroll position hook for cursor.com-style dynamic border behavior
  const { isAtTop, isScrolled } = useScrollPosition(20, 5);

  // Function to handle scrolling to a section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(sectionId);
    }
  };

  // Set up intersection observer to highlight active section in navigation
  useEffect(() => {
    const sections = ["services", "pricing", "testimonials", "contact"];

    const observerOptions = {
      root: null,
      rootMargin: "-100px 0px -100px 0px",
      threshold: 0.2,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      sections.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, []);

  const handleLogin = () => {
    setLocation("/sign-in");
  };

  const handleSignUp = () => {
    setLocation("/sign-up");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback: redirect to home even if logout fails
      setLocation("/");
    }
  };

  const handleOwnerAuth = () => {
    // Redirect to sign-in page with owner parameter
    setLocation(
      "/sign-in?owner=true&message=Please%20enter%20your%20secret%20key%20to%20access%20Owner%20Dashboard"
    );
  };

  // Navigation items for cursor.com-style navbar
  const navItems = [
    { name: "Services", href: "#services" },
    { name: "Pricing", href: "#pricing" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "Contact", href: "#contact" },
  ];

  // Handle navigation item clicks
  const handleNavClick = (href: string) => {
    const sectionId = href.replace("#", "");
    scrollToSection(sectionId);
  };

  return (
    <header className="fixed top-4 left-0 right-0 z-50">
      {/* Navbar width precisely aligned with hero section content boundaries */}
      <div className="container mx-auto px-4 sm:px-6">
        <nav
          className={`flex items-center rounded-xl px-6 sm:px-8 lg:px-10 py-3.5 transition-all duration-300 ease-out ${
            isAtTop
              ? "bg-background/30 backdrop-blur-sm border-transparent shadow-none ring-0"
              : "bg-background/95 backdrop-blur-md border border-border/40 shadow-xl ring-1 ring-white/10"
          }`}
        >
          {/* Logo - Anchored to left edge */}
          <div className="flex items-center flex-shrink-0">
            <img
              src="/navbar_logo.svg"
              alt="SharpFlow Logo"
              className="h-14 w-auto"
            />
          </div>

          {/* Navigation Links - Centered between logo and auth buttons */}
          <div className="hidden md:flex items-center justify-center flex-1 space-x-2 lg:space-x-3 mx-8 lg:mx-12">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.href)}
                className={`relative px-4 lg:px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-out ${
                  isAtTop ? "hover:bg-background/50" : "hover:bg-muted/50"
                } ${
                  activeSection === item.name.toLowerCase()
                    ? `text-foreground ${
                        isAtTop ? "bg-background/40" : "bg-muted/30"
                      }`
                    : `${
                        isAtTop ? "text-foreground/90" : "text-foreground/70"
                      } hover:text-foreground`
                }`}
              >
                {item.name}
                {activeSection === item.name.toLowerCase() && (
                  <div
                    className="absolute inset-0 rounded-lg opacity-20"
                    style={{
                      background:
                        "linear-gradient(135deg, #38B6FF 0%, #C1FF72 100%)",
                      mixBlendMode: "overlay",
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Auth Buttons - Anchored to right edge */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {!isLoading && (
              <>
                {isAuthenticated && user ? (
                  <div className="hidden md:flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <ProfileImage
                        src={user.profileImageUrl}
                        alt="Profile"
                        size="sm"
                        fallbackIcon={true}
                        userName={`${user.firstName} ${user.lastName}`.trim()}
                        userEmail={user.email}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {user.firstName || user.email}
                      </span>
                    </div>

                    {/* Owner Authentication Button - Only show for non-owner users */}
                    {user.email !== "shajith240@gmail.com" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOwnerAuth}
                        className="flex items-center space-x-2 text-sm h-9 border-[#C1FF72]/30 text-[#C1FF72] hover:bg-[#C1FF72]/10"
                        title="Switch to Owner Dashboard"
                      >
                        <Crown className="w-4 h-4" />
                        <span>Owner</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="flex items-center space-x-2 text-sm h-9"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </Button>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      onClick={handleLogin}
                      className={`flex items-center space-x-2 text-sm h-9 px-4 text-foreground/80 hover:text-foreground transition-all duration-300 ${
                        isAtTop ? "hover:bg-background/50" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="font-medium">Sign in</span>
                    </Button>
                    <Button
                      onClick={handleSignUp}
                      className={`flex items-center space-x-2 bg-[#38B6FF] hover:bg-[#38B6FF]/90 text-white text-sm h-9 px-4 rounded-lg font-medium transition-all duration-300 ${
                        isAtTop
                          ? "shadow-sm hover:shadow-md"
                          : "shadow-sm hover:shadow-md"
                      }`}
                    >
                      <span>Sign up</span>
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Mobile menu indicator - shows that mobile menu is available */}
            <div className="md:hidden">
              <div className="w-2 h-2 bg-[#38B6FF] rounded-full opacity-60"></div>
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />
    </header>
  );
}
