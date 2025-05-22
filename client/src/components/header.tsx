import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import artivanceLogo from "@assets/1.png";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src={artivanceLogo} alt="ARTIVANCE Logo" className="h-12 w-auto" />
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('services')}
              className="text-gray-700 hover:text-[#38B6FF] transition-colors"
            >
              Services
            </button>
            <button 
              onClick={() => scrollToSection('pricing')}
              className="text-gray-700 hover:text-[#38B6FF] transition-colors"
            >
              Pricing
            </button>
            <button 
              onClick={() => scrollToSection('testimonials')}
              className="text-gray-700 hover:text-[#38B6FF] transition-colors"
            >
              Testimonials
            </button>
            <button 
              onClick={() => scrollToSection('contact')}
              className="text-gray-700 hover:text-[#38B6FF] transition-colors"
            >
              Contact
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {!isLoading && (
              <>
                {isAuthenticated && user ? (
                  <div className="hidden md:flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {user.profileImageUrl ? (
                        <img 
                          src={user.profileImageUrl} 
                          alt="Profile" 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 p-2 bg-gray-100 rounded-full" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {user.firstName || user.email}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleLogin}
                    className="hidden md:flex items-center space-x-2 border-gray-300 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Sign in</span>
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2 text-gray-600 hover:text-[#38B6FF]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-100">
            <div className="flex flex-col space-y-4 pt-4">
              <button 
                onClick={() => scrollToSection('services')}
                className="text-left text-gray-700 hover:text-[#38B6FF] transition-colors"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="text-left text-gray-700 hover:text-[#38B6FF] transition-colors"
              >
                Pricing
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')}
                className="text-left text-gray-700 hover:text-[#38B6FF] transition-colors"
              >
                Testimonials
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="text-left text-gray-700 hover:text-[#38B6FF] transition-colors"
              >
                Contact
              </button>
              {!isLoading && (
                <>
                  {isAuthenticated && user ? (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2 mb-3">
                        {user.profileImageUrl ? (
                          <img 
                            src={user.profileImageUrl} 
                            alt="Profile" 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 p-2 bg-gray-100 rounded-full" />
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {user.firstName || user.email}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleLogin}
                      className="w-full flex items-center justify-center space-x-2 border-gray-300 hover:bg-gray-50"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Sign in</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
