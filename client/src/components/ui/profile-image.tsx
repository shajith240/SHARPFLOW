import React, { useState, useEffect } from "react";
import { User } from "lucide-react";

interface ProfileImageProps {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fallbackIcon?: boolean;
  fallbackSrc?: string;
  userName?: string;
  userEmail?: string;
}

const sizeClasses = {
  sm: "w-7 h-7 sm:w-8 sm:h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

// Generate initials from name
const getInitials = (name?: string, email?: string): string => {
  if (name) {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return "U";
};

// Generate a color based on the user's name or email using SharpFlow professional dark theme
const getAvatarColor = (name?: string, email?: string): string => {
  const colors = [
    "bg-secondary", // Sky Blue (#38B6FF)
    "bg-primary", // Lime Green (#C1FF72)
    "bg-gradient-to-br from-secondary to-primary", // Sky Blue to Lime Green
    "bg-dashboard-info", // Sky Blue variant
    "bg-dashboard-success", // Soft Green variant
    "bg-gradient-to-br from-primary to-secondary", // Lime Green to Sky Blue
  ];
  const str = name || email || "default";
  const hash = str.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return colors[Math.abs(hash) % colors.length];
};

export const ProfileImage: React.FC<ProfileImageProps> = ({
  src,
  alt = "Profile",
  size = "md",
  className = "",
  fallbackIcon = true,
  fallbackSrc,
  userName,
  userEmail,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [processedSrc, setProcessedSrc] = useState<string | undefined>(src);

  // Process profile image URLs - prioritize ARTIVANCE avatars for Google images
  useEffect(() => {
    if (src) {
      // For Google profile images, skip loading and go straight to SharpFlow avatars
      // since they have CORS restrictions and don't load reliably
      if (src.includes("googleusercontent.com")) {
        setProcessedSrc(undefined);
        setImageError(true); // Trigger fallback immediately
        setIsLoading(false);
        return;
      }

      // For non-Google images (like server proxy URLs), try to load them
      setProcessedSrc(src);
      setImageError(false);
      setIsLoading(true);
    } else {
      setProcessedSrc(undefined);
      setImageError(false);
      setIsLoading(false);
    }
  }, [src]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  const handleImageError = (e: any) => {
    setIsLoading(false);
    setImageError(true);

    // Try fallback source if provided
    if (fallbackSrc && processedSrc !== fallbackSrc) {
      setProcessedSrc(fallbackSrc);
      setImageError(false);
      setIsLoading(true);
    }
  };

  const baseClasses = `${sizeClasses[size]} rounded-full object-cover ${className}`;

  // Show loading state
  if (isLoading && processedSrc) {
    return (
      <div
        className={`${baseClasses} bg-gray-200 animate-pulse flex items-center justify-center`}
      >
        <User className="w-1/2 h-1/2 text-gray-400" />
      </div>
    );
  }

  // Show image if available and no error
  if (processedSrc && !imageError) {
    return (
      <img
        src={processedSrc}
        alt={alt}
        className={baseClasses}
        onLoad={handleImageLoad}
        onError={handleImageError}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Show fallback avatar with initials or icon using SharpFlow theme
  if (fallbackIcon) {
    const initials = getInitials(userName, userEmail);
    const avatarColor = getAvatarColor(userName, userEmail);

    // Determine text color based on background for better contrast
    const isLimeGreen = avatarColor.includes("#C1FF72");
    const textColor = isLimeGreen ? "text-gray-800" : "text-white";

    return (
      <div
        className={`${baseClasses} ${avatarColor} flex items-center justify-center font-bold shadow-md border-2 border-white/20`}
      >
        {userName || userEmail ? (
          <span
            className={`text-xs sm:text-sm ${textColor} font-semibold tracking-wide`}
          >
            {initials}
          </span>
        ) : (
          <User className={`w-1/2 h-1/2 ${textColor}`} />
        )}
      </div>
    );
  }

  // Return null if no fallback requested
  return null;
};
