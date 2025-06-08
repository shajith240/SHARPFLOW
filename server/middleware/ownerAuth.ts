import type { Request, Response, NextFunction } from "express";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  isOwnerAuthenticated?: boolean;
}

/**
 * Middleware to check if user is authenticated as owner
 * This checks both email and that they went through the secret key authentication
 */
export const requireOwnerAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    
    if (!userId || !userEmail) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    // Check if user email matches owner email
    const ownerEmail = process.env.OWNER_EMAIL || "shajith240@gmail.com";
    const isOwnerEmail = userEmail.toLowerCase() === ownerEmail.toLowerCase();
    
    if (!isOwnerEmail) {
      console.log(`❌ Access denied: ${userEmail} is not the owner email`);
      return res.status(403).json({ 
        message: "Owner access required",
        code: "OWNER_ACCESS_REQUIRED"
      });
    }

    // Check if this session was authenticated with the secret key
    // We'll store this in the session during the signin process
    const isOwnerAuthenticated = (req.session as any)?.isOwnerAuthenticated;
    
    if (!isOwnerAuthenticated) {
      console.log(`❌ Access denied: ${userEmail} did not authenticate with secret key`);
      return res.status(403).json({ 
        message: "Owner secret key authentication required. Please sign in with your secret key.",
        code: "SECRET_KEY_REQUIRED"
      });
    }

    console.log(`✅ Owner access granted: ${userEmail}`);
    req.isOwnerAuthenticated = true;
    next();
  } catch (error) {
    console.error("Owner auth middleware error:", error);
    res.status(500).json({ 
      message: "Authentication error",
      code: "AUTH_ERROR"
    });
  }
};

/**
 * Middleware to check if user is the owner (email only, no secret key required)
 * Used for routes that should be accessible to owner but don't require secret key
 */
export const isOwner = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    const ownerEmail = process.env.OWNER_EMAIL || "shajith240@gmail.com";
    const isOwnerEmail = userEmail.toLowerCase() === ownerEmail.toLowerCase();
    
    if (!isOwnerEmail) {
      return res.status(403).json({ 
        message: "Owner access required",
        code: "OWNER_ACCESS_REQUIRED"
      });
    }

    next();
  } catch (error) {
    console.error("Owner check middleware error:", error);
    res.status(500).json({ 
      message: "Authentication error",
      code: "AUTH_ERROR"
    });
  }
};

/**
 * Store owner authentication status in session
 */
export const setOwnerAuthenticationStatus = (req: AuthenticatedRequest, isOwnerAuthenticated: boolean) => {
  if (req.session) {
    (req.session as any).isOwnerAuthenticated = isOwnerAuthenticated;
  }
};

/**
 * Clear owner authentication status from session
 */
export const clearOwnerAuthenticationStatus = (req: AuthenticatedRequest) => {
  if (req.session) {
    (req.session as any).isOwnerAuthenticated = false;
  }
};
