import express from "express";
import { supabase } from "../db.js";
import { isAuthenticated } from "../googleAuth.js";

const router = express.Router();

// Setup notifications table endpoint
router.post("/setup-notifications", isAuthenticated, async (req, res) => {
  try {
    console.log("🔧 Setting up notifications table...");

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: "Database connection not configured",
      });
    }

    // Create notifications table
    const createTableSQL = `
      -- Create notifications table for the notification system
      CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR PRIMARY KEY NOT NULL,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR NOT NULL CHECK (type IN ('job_completed', 'job_failed', 'job_started', 'system_notification', 'maintenance_notification')),
          title VARCHAR NOT NULL,
          message TEXT NOT NULL,
          agent_name VARCHAR CHECK (agent_name IN ('prism', 'falcon', 'sage', 'sentinel')),
          job_id VARCHAR,
          job_type VARCHAR,
          metadata JSONB DEFAULT '{}',
          is_read BOOLEAN DEFAULT false,
          is_dismissed BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          read_at TIMESTAMP,
          dismissed_at TIMESTAMP
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });

    if (createError) {
      console.error("Error creating notifications table:", createError);
      // Try alternative approach
      const { error: altError } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);
      
      if (altError && altError.code === '42P01') {
        // Table doesn't exist, create it manually
        console.log("Creating table using direct SQL...");
        
        // Use raw SQL execution
        const { error: rawError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE notifications (
                id VARCHAR PRIMARY KEY NOT NULL,
                user_id VARCHAR NOT NULL,
                type VARCHAR NOT NULL,
                title VARCHAR NOT NULL,
                message TEXT NOT NULL,
                agent_name VARCHAR,
                job_id VARCHAR,
                job_type VARCHAR,
                metadata JSONB DEFAULT '{}',
                is_read BOOLEAN DEFAULT false,
                is_dismissed BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                read_at TIMESTAMP,
                dismissed_at TIMESTAMP
            );
          `
        });

        if (rawError) {
          console.error("Raw SQL error:", rawError);
          return res.status(500).json({
            success: false,
            error: "Failed to create notifications table",
            details: rawError.message,
          });
        }
      }
    }

    // Add indexes
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_agent_name ON notifications(agent_name);
    `;

    const { error: indexError } = await supabase.rpc('exec_sql', { 
      sql: indexSQL 
    });

    if (indexError) {
      console.warn("Warning: Could not create indexes:", indexError);
    }

    // Test the table
    const { data: testData, error: testError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    if (testError) {
      console.error("Table test failed:", testError);
      return res.status(500).json({
        success: false,
        error: "Table creation verification failed",
        details: testError.message,
      });
    }

    console.log("✅ Notifications table setup completed successfully!");

    res.json({
      success: true,
      message: "Notifications table created successfully",
      tableExists: true,
    });

  } catch (error) {
    console.error("Error setting up notifications table:", error);
    res.status(500).json({
      success: false,
      error: "Failed to setup notifications table",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
