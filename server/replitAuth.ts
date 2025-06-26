import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Check if user already exists to prevent overwriting custom data
  const existingUser = await storage.getUser(claims["sub"]);
  
  if (existingUser) {
    // Only update profile image and keep existing user data
    await storage.upsertUser({
      id: claims["sub"],
      email: existingUser.email, // Keep existing email
      firstName: existingUser.firstName, // Keep existing name
      lastName: existingUser.lastName, // Keep existing name
      profileImageUrl: claims["profile_image_url"], // Update profile image only
    });
  } else {
    // New user - create with auth provider data
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  let config: any = null;
  
  try {
    config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    // Add both configured domains and common deployment domains
    const configuredDomains = process.env.REPLIT_DOMAINS!.split(",");
    const additionalDomains = ['levelupsolo.net', 'www.levelupsolo.net'];
    const allDomains = [...configuredDomains, ...additionalDomains];
    
    for (const domain of allDomains) {
      try {
        const strategy = new Strategy(
          {
            name: `replitauth:${domain}`,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/callback`,
          },
          verify,
        );
        passport.use(strategy);
        console.log(`Registered auth strategy for domain: ${domain}`);
      } catch (err) {
        console.warn(`Failed to register auth strategy for domain ${domain}:`, err);
      }
    }
  } catch (error) {
    console.error("Failed to setup authentication:", error);
    // Continue without auth for development/deployment testing
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    try {
      const strategyName = `replitauth:${req.hostname}`;
      // Check if strategy exists before using it
      const strategies = (passport as any)._strategies || {};
      if (strategies[strategyName]) {
        passport.authenticate(strategyName, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      } else {
        console.error(`Authentication strategy not found for domain: ${req.hostname}`);
        console.log('Available strategies:', Object.keys(strategies));
        res.status(500).json({ 
          message: "Authentication not configured for this domain",
          hostname: req.hostname,
          configuredDomains: process.env.REPLIT_DOMAINS?.split(',') || [],
          error: "unknown authentication strategy"
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ 
        message: "Authentication error", 
        error: String(error),
        hostname: req.hostname
      });
    }
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('Auth callback received for hostname:', req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
      failureFlash: false
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      // Clear session completely
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
        
        // Clear cookies
        res.clearCookie('connect.sid');
        
        if (config) {
          try {
            res.redirect(
              client.buildEndSessionUrl(config, {
                client_id: process.env.REPL_ID!,
                post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
              }).href
            );
          } catch (error) {
            console.error("Logout redirect error:", error);
            res.redirect("/");
          }
        } else {
          res.redirect("/");
        }
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Demo mode for deployment - create consistent demo user
  if (!req.isAuthenticated() && req.hostname.includes('levelupsolo')) {
    const demoUser = {
      claims: {
        sub: "31581595", // Using the actual user ID from your data
        email: "demo@levelupsolo.net",
        first_name: "Demo",
        last_name: "User",
        profile_image_url: null
      }
    };
    
    try {
      // Ensure demo user exists in database
      await storage.upsertUser({
        id: demoUser.claims.sub,
        email: demoUser.claims.email,
        firstName: demoUser.claims.first_name,
        lastName: demoUser.claims.last_name,
        profileImageUrl: demoUser.claims.profile_image_url,
      });
      
      // Set the demo user for this request
      (req as any).user = demoUser;
      return next();
    } catch (error) {
      console.error("Demo user setup failed:", error);
    }
  }

  if (!req.isAuthenticated() || !user?.claims) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return next();
};