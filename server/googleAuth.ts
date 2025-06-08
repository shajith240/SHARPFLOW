import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memorystore from "memorystore";
import { storage } from "./storage";
import { setOwnerAuthenticationStatus } from "./middleware/ownerAuth.js";

// Create a memory store for sessions (for development only)
const MemoryStore = memorystore(session);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
    ttl: sessionTtl, // Set TTL for the store
  });

  return session({
    secret: process.env.SESSION_SECRET || "local-dev-secret-artivance-2024",
    store: sessionStore,
    resave: true, // Force session save even if unmodified
    saveUninitialized: true, // Save uninitialized sessions
    name: "sharpflow.sid", // Custom session name
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: "lax", // Important for OAuth redirects
      maxAge: sessionTtl,
      // Remove domain restriction for localhost
    },
    rolling: true, // Reset expiration on activity
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Add session debugging middleware
  app.use((req: any, res, next) => {
    if (req.path.includes("/api/")) {
      console.log(`🔐 Session Debug - ${req.method} ${req.path}:`, {
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated?.(),
        userEmail: req.user?.email,
        userId: req.user?.id,
        sessionExists: !!req.session,
        sessionData: req.session ? Object.keys(req.session) : [],
      });
    }
    next();
  });

  // Serialize and deserialize user
  passport.serializeUser((user: any, cb) => {
    console.log("🔐 Serializing user:", user.id, user.email);
    cb(null, user.id); // Store only user ID in session
  });

  passport.deserializeUser(async (id: string, cb) => {
    try {
      console.log("🔐 Deserializing user ID:", id);
      const user = await storage.getUser(id);
      if (user) {
        console.log("✅ User found during deserialization:", user.email);
        cb(null, user);
      } else {
        console.log("❌ User not found during deserialization:", id);
        cb(null, false);
      }
    } catch (error) {
      console.error("❌ Error during user deserialization:", error);
      cb(error, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Determine the base URL dynamically
    const port = process.env.PORT || 3000;
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.PRODUCTION_URL || `https://your-domain.com`
        : `http://localhost:${port}`;

    console.log("🔍 Google OAuth Configuration:", {
      clientID: process.env.GOOGLE_CLIENT_ID,
      callbackURL: `${baseUrl}/api/auth/google/callback`,
      baseUrl,
      port,
      nodeEnv: process.env.NODE_ENV,
    });

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${baseUrl}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Extract and process profile image URL
            let profileImageUrl = profile.photos?.[0]?.value || "";

            // Process Google profile image URL for better compatibility
            if (
              profileImageUrl &&
              profileImageUrl.includes("googleusercontent.com")
            ) {
              // Handle very long URLs (custom profile pictures) by using alternative approach
              if (profileImageUrl.length > 200) {
                // For very long URLs, create a server-side proxy URL
                // This avoids CORS and authentication issues
                const userId = profile.id;
                const originalUrl = profileImageUrl;

                // Store the original URL in memory for the proxy to use
                global.profileImageCache =
                  global.profileImageCache || new Map();
                global.profileImageCache.set(userId, originalUrl);

                profileImageUrl = `/api/auth/profile-image/${userId}`;
              } else {
                // Handle normal URLs (default profile pictures)
                // Remove any existing size parameters and add our own
                const baseUrl = profileImageUrl.split("=")[0];
                profileImageUrl = `${baseUrl}=s200-c`;
              }
            }

            // Extract user information from Google profile
            const googleUser = {
              id: `google-${profile.id}`,
              email: profile.emails?.[0]?.value || "",
              firstName: profile.name?.givenName || "",
              lastName: profile.name?.familyName || "",
              profileImageUrl,
            };

            // Store or update user in database
            await storage.upsertUser(googleUser);

            return done(null, googleUser);
          } catch (error) {
            return done(error, undefined);
          }
        }
      )
    );

    // Google OAuth routes
    app.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/sign-in" }),
      (req: any, res) => {
        // Successful authentication
        console.log("✅ Google OAuth successful, user:", req.user?.email);
        console.log("🔐 Session ID:", req.sessionID);
        console.log("🔐 Is Authenticated:", req.isAuthenticated());

        // Check if this is the owner email
        const ownerEmail = process.env.OWNER_EMAIL || "shajith240@gmail.com";
        const isOwnerEmail =
          req.user?.email?.toLowerCase() === ownerEmail.toLowerCase();

        // Save session explicitly
        req.session.save((err: any) => {
          if (err) {
            console.error("❌ Session save error:", err);
          } else {
            console.log("✅ Session saved successfully");
          }

          // Redirect based on user type
          if (isOwnerEmail) {
            console.log(
              `👑 Owner ${req.user.email} authenticated via Google OAuth - redirecting to sign-in for secret key`
            );
            // Redirect to sign-in with a special parameter to show owner fields
            res.redirect(
              "/sign-in?owner=true&message=Please enter your secret key to access the Owner Dashboard"
            );
          } else {
            console.log(
              `👤 User ${req.user.email} authenticated via Google OAuth - redirecting to user dashboard`
            );
            // Redirect to dashboard after successful authentication
            res.redirect("/dashboard");
          }
        });
      }
    );
  } else {
    // Fallback routes when Google OAuth is not configured
    app.get("/api/auth/google", (req, res) => {
      res.status(503).json({
        message:
          "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
        configured: false,
      });
    });

    app.get("/api/auth/google/callback", (req, res) => {
      res.redirect("/sign-in?error=oauth_not_configured");
    });
  }

  // Logout route
  app.get("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  // Profile image proxy endpoint
  app.get("/api/auth/profile-image/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      // Get the original URL from cache
      const profileImageCache = global.profileImageCache || new Map();
      const originalUrl = profileImageCache.get(userId);

      if (!originalUrl) {
        return res.status(404).json({ message: "Profile image not found" });
      }

      // Fetch the image from Google
      const response = await fetch(originalUrl);

      if (!response.ok) {
        console.error(`Failed to fetch profile image: ${response.status}`);
        return res.status(404).json({ message: "Image not accessible" });
      }

      // Set appropriate headers
      res.set({
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
      });

      // Pipe the image data
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Profile image proxy error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Regular email/password authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Basic validation
      if (!email || !password || !firstName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // In a real app, you would hash the password here
      // For demo purposes, we'll create a user without password hashing
      const newUser = {
        id: `email-${Date.now()}`,
        email,
        firstName,
        lastName: lastName || "",
        profileImageUrl: "",
      };

      await storage.upsertUser(newUser);

      // Log the user in
      req.login(newUser, () => {
        res.json({ success: true, user: newUser });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password, ownerSecretKey } = req.body;

      // Basic validation
      if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
      }

      // Check for owner authentication
      const ownerEmail = process.env.OWNER_EMAIL || "shajith240@gmail.com";
      const expectedSecretKey = process.env.ENCRYPTION_KEY;
      const isOwnerEmail = email.toLowerCase() === ownerEmail.toLowerCase();

      let isOwnerAuthentication = false;

      // If this is the owner email and secret key is provided, validate it
      if (isOwnerEmail && ownerSecretKey) {
        if (ownerSecretKey === expectedSecretKey) {
          isOwnerAuthentication = true;
          console.log("🔐 Owner authentication successful");
        } else {
          return res.status(401).json({
            message: "Invalid owner secret key",
          });
        }
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real app, you would verify the password hash here
      // For demo purposes, we'll just log them in
      req.login(user, () => {
        // Store owner authentication status in session
        setOwnerAuthenticationStatus(req as any, isOwnerAuthentication);

        const response: any = {
          success: true,
          user,
          isOwner: isOwnerAuthentication,
          redirectToOwnerDashboard: isOwnerAuthentication,
        };

        if (isOwnerAuthentication) {
          console.log(
            `👑 Owner ${email} authenticated with secret key - redirecting to owner dashboard`
          );
        } else if (isOwnerEmail) {
          console.log(
            `👤 Owner ${email} authenticated as regular user - redirecting to user dashboard`
          );
        } else {
          console.log(
            `👤 User ${email} authenticated - redirecting to user dashboard`
          );
        }

        res.json(response);
      });
    } catch (error) {
      console.error("Signin error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout route
  app.get("/api/auth/logout", (req: any, res) => {
    const userEmail = req.user?.email;
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }

      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Session cleanup failed" });
        }

        console.log(`👋 User logged out: ${userEmail}`);
        res.clearCookie("artivance.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return next();
};

// Middleware to check if user has active subscription
export const requireActiveSubscription: RequestHandler = async (
  req,
  res,
  next
) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const sessionUser = req.user as any;

    // Fetch latest user data from database to get updated subscription status
    const { storage } = await import("./storage");
    const user = await storage.getUser(sessionUser.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    console.log(`🔍 Subscription check for ${user.email}:`, {
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionPeriodEnd: user.subscriptionPeriodEnd,
    });

    // For testing: Allow access if user has a subscription plan (regardless of status)
    // In production, you'd want to enforce active status
    if (!user.subscriptionPlan) {
      return res.status(403).json({
        message: "Subscription plan required",
        subscriptionRequired: true,
      });
    }

    // Check if subscription is expired (but allow for testing)
    if (
      user.subscriptionPeriodEnd &&
      new Date(user.subscriptionPeriodEnd) < new Date()
    ) {
      console.log("⚠️ Subscription expired but allowing access for testing");
      // For testing, we'll allow expired subscriptions
      // return res.status(403).json({
      //   message: "Subscription expired",
      //   subscriptionExpired: true,
      // });
    }

    // Add updated user to request for use in route handlers
    (req as any).currentUser = user;

    return next();
  } catch (error) {
    console.error("Subscription check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
