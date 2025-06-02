"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, User, Settings, Bell, Grid, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useLocation } from "wouter";
import { ProfileImage } from "./profile-image";

const AnimatedMenuToggle = ({
  toggle,
  isOpen,
}: {
  toggle: () => void;
  isOpen: boolean;
}) => (
  <button
    onClick={toggle}
    aria-label="Toggle menu"
    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38B6FF] focus-visible:ring-offset-2 z-999 px-3 py-2 rounded-lg bg-[#38B6FF] shadow-md hover:bg-[#38B6FF]/90 active:bg-[#38B6FF]/80 transition-all duration-200"
  >
    <motion.div>
      <motion.svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        transition={{ duration: 0.3 }}
        className="text-white"
      >
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: "M 2 2.5 L 22 2.5" },
            open: { d: "M 3 16.5 L 17 2.5" },
          }}
        />
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: "M 2 12 L 22 12", opacity: 1 },
            open: { opacity: 0 },
          }}
          transition={{ duration: 0.2 }}
        />
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: "M 2 21.5 L 22 21.5" },
            open: { d: "M 3 2.5 L 17 16.5" },
          }}
        />
      </motion.svg>
    </motion.div>
  </button>
);

const CollapsibleSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3">
      <button
        className="w-full flex items-center justify-between py-2.5 px-4 rounded-lg text-white hover:bg-[#1e293b] active:bg-[#334155] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-sm">{title}</span>
        <div
          className="text-[#38B6FF] flex items-center justify-center h-5 w-5 transition-opacity duration-200"
          style={{ opacity: open ? 0.8 : 1 }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: "easeInOut",
            }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2 mt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MobileSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const mobileSidebarVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    logout();
    setLocation("/");
    setIsOpen(false);
  };

  const handleLogin = () => {
    setLocation("/sign-in");
    setIsOpen(false);
  };

  const handleSignUp = () => {
    setLocation("/sign-up");
    setIsOpen(false);
  };

  const handleNavigate = (path: string) => {
    console.log(`Navigating to: ${path}`);

    // If the path contains a hash, scroll to that section
    if (path.includes("#")) {
      const sectionId = path.split("#")[1];
      console.log(`Looking for section with ID: ${sectionId}`);

      // First close the sidebar
      setIsOpen(false);

      // If we're not on the home page, navigate to home first
      if (location !== "/") {
        console.log("Not on home page, navigating to home first");
        setLocation("/");

        // Then scroll to the section after a delay to allow for page load
        setTimeout(() => {
          const targetElement = document.getElementById(sectionId);
          if (targetElement) {
            console.log(`Found element, scrolling to ${sectionId}`);
            targetElement.scrollIntoView({ behavior: "smooth" });
          } else {
            console.log(
              `Element with ID ${sectionId} not found after navigation`
            );
          }
        }, 500);
      } else {
        // If we're already on the home page, just scroll to the section
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (element) {
            console.log(`Found element, scrolling to ${sectionId}`);
            element.scrollIntoView({ behavior: "smooth" });
          } else {
            console.log(
              `Element with ID ${sectionId} not found on current page`
            );
          }
        }, 300);
      }

      return;
    }

    // For non-hash paths, use the regular navigation
    console.log(`Regular navigation to ${path}`);
    setLocation(path);
    setIsOpen(false);
  };

  return (
    <div className="md:hidden relative">
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex">
            {/* Backdrop with blur effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
              onClick={toggleSidebar}
              aria-hidden="true"
            />

            {/* Sidebar panel */}
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={mobileSidebarVariants}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className="relative w-[85%] max-w-[320px] h-screen bg-[#0f172a] text-white shadow-xl overflow-y-auto border-r border-[#1e293b]"
            >
              <div className="flex flex-col h-full">
                {/* Profile Section */}
                {/* Header with close button */}
                <div className="flex items-center justify-between p-5 border-b border-[#1e293b] bg-[#0c1525]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                      {isAuthenticated && user ? (
                        <ProfileImage
                          src={user.profileImageUrl}
                          alt="Profile"
                          size="md"
                          className="w-full h-full"
                          fallbackIcon={true}
                          userName={`${user.firstName} ${user.lastName}`.trim()}
                          userEmail={user.email}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#38B6FF] rounded-full flex items-center justify-center">
                          <img
                            src="/sharpflow.png"
                            alt="SharpFlow Logo"
                            className="w-8 h-8 object-contain"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      {isAuthenticated ? (
                        <>
                          <p className="font-semibold text-white">
                            {user?.firstName || user?.email || "User"}
                          </p>
                          <p className="text-xs text-[#94a3b8]">
                            {user?.email}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-white">SharpFlow</p>
                          <p className="text-xs text-[#94a3b8]">AI Solutions</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-full hover:bg-[#1e293b] active:bg-[#334155] transition-colors"
                    aria-label="Close menu"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#38B6FF"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                {/* Navigation Section */}
                <nav className="flex-1 px-4 py-5 overflow-y-auto">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-3 px-2">
                    Navigation
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <button
                        className="flex items-center w-full py-3 px-4 rounded-lg text-white hover:bg-[#1e293b] active:bg-[#334155] transition-colors group"
                        onClick={() => handleNavigate("/")}
                      >
                        <Home className="h-5 w-5 text-[#38B6FF] mr-3 group-hover:opacity-80 transition-opacity" />
                        <span className="font-medium text-sm">Home</span>
                      </button>
                    </li>
                    <li>
                      <button
                        className="flex items-center w-full py-3 px-4 rounded-lg text-white hover:bg-[#1e293b] active:bg-[#334155] transition-colors group"
                        onClick={() => handleNavigate("/#services")}
                      >
                        <Grid className="h-5 w-5 text-[#38B6FF] mr-3 group-hover:opacity-80 transition-opacity" />
                        <span className="font-medium text-sm">Services</span>
                      </button>
                    </li>
                    <li>
                      <button
                        className="flex items-center w-full py-3 px-4 rounded-lg text-white hover:bg-[#1e293b] active:bg-[#334155] transition-colors group"
                        onClick={() => handleNavigate("/#pricing")}
                      >
                        <Bell className="h-5 w-5 text-[#38B6FF] mr-3 group-hover:opacity-80 transition-opacity" />
                        <span className="font-medium text-sm">Pricing</span>
                      </button>
                    </li>
                    <li>
                      <button
                        className="flex items-center w-full py-3 px-4 rounded-lg text-white hover:bg-[#1e293b] active:bg-[#334155] transition-colors group"
                        onClick={() => handleNavigate("/#contact")}
                      >
                        <Settings className="h-5 w-5 text-[#38B6FF] mr-3 group-hover:opacity-80 transition-opacity" />
                        <span className="font-medium text-sm">Contact</span>
                      </button>
                    </li>
                  </ul>
                </nav>
                {/* Footer / Action Button */}
                <div className="p-5 border-t border-[#1e293b] flex-shrink-0">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-4 px-2">
                    Account
                  </h3>
                  {isAuthenticated ? (
                    <button
                      className="w-full font-medium text-sm py-3 px-4 text-center bg-[#1e293b] border border-red-500 text-red-400 rounded-lg hover:bg-red-500/10 active:bg-red-500/20 transition-colors shadow-sm flex items-center justify-center gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <button
                        className="w-full font-medium text-sm py-3 px-4 text-center bg-[#38B6FF] text-white rounded-lg hover:bg-[#38B6FF]/90 active:bg-[#38B6FF]/80 transition-colors shadow-sm"
                        onClick={handleSignUp}
                      >
                        Sign up
                      </button>
                      <button
                        className="w-full font-medium text-sm py-3 px-4 text-center bg-transparent border border-[#38B6FF] text-[#38B6FF] rounded-lg hover:bg-[#38B6FF]/10 active:bg-[#38B6FF]/20 transition-colors shadow-sm"
                        onClick={handleLogin}
                      >
                        Sign in
                      </button>
                      <p className="text-xs text-center text-[#94a3b8] mt-2 px-2">
                        Join ARTIVANCE to access premium AI solutions
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toggle Button - Only visible when sidebar is closed */}
      {!isOpen && (
        <motion.div
          className="fixed top-6 right-6 z-[100] drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <AnimatedMenuToggle toggle={toggleSidebar} isOpen={isOpen} />
        </motion.div>
      )}
    </div>
  );
};

export { MobileSidebar, AnimatedMenuToggle };
