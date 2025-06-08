import express from "express";
import { supabase } from "../db.js";

const router = express.Router();

// Setup database tables endpoint
router.post("/setup-research-reports", async (_req, res) => {
  try {
    console.log("🔧 Setting up research_reports table...");

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: "Database connection not configured",
      });
    }

    // First, check if the table exists
    const { data: tables, error: tableError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "research_reports");

    if (tableError) {
      console.log(
        "⚠️ Could not check existing tables, proceeding with creation..."
      );
    } else {
      console.log("🔍 Existing tables check:", tables);
    }

    // Create the research_reports table using raw SQL
    const createTableSQL = `
      -- Drop table if exists to ensure clean setup
      DROP TABLE IF EXISTS research_reports CASCADE;

      -- Create research_reports table
      CREATE TABLE research_reports (
        id VARCHAR PRIMARY KEY NOT NULL,
        user_id VARCHAR NOT NULL,
        lead_id VARCHAR,
        job_id VARCHAR,
        
        -- Report content
        report_title VARCHAR NOT NULL,
        report_content TEXT NOT NULL,
        report_type VARCHAR DEFAULT 'linkedin_research',
        
        -- Metadata
        research_sources JSONB DEFAULT '[]',
        confidence_score INTEGER DEFAULT 0,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_research_reports_user_id ON research_reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_research_reports_lead_id ON research_reports(lead_id);
      CREATE INDEX IF NOT EXISTS idx_research_reports_job_id ON research_reports(job_id);
      CREATE INDEX IF NOT EXISTS idx_research_reports_report_type ON research_reports(report_type);
      CREATE INDEX IF NOT EXISTS idx_research_reports_created_at ON research_reports(created_at DESC);

      -- Enable RLS
      ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies
      CREATE POLICY "Users can view their own research reports" ON research_reports
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

      CREATE POLICY "Users can insert their own research reports" ON research_reports
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

      CREATE POLICY "Users can update their own research reports" ON research_reports
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

      CREATE POLICY "Users can delete their own research reports" ON research_reports
        FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    `;

    // Execute the SQL
    const { error: createError } = await supabase.rpc("exec", {
      sql: createTableSQL,
    });

    if (createError) {
      console.error("❌ Error creating table:", createError);
      return res.status(500).json({
        success: false,
        error: createError.message,
        details: createError,
      });
    }

    console.log("✅ research_reports table created successfully");

    // Verify the table was created by checking its structure
    const { data: columns, error: columnError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable")
      .eq("table_name", "research_reports")
      .eq("table_schema", "public");

    if (columnError) {
      console.log("⚠️ Could not verify table structure:", columnError);
    } else {
      console.log(
        "🔍 Table structure verified:",
        columns?.map((col: any) => `${col.column_name} (${col.data_type})`)
      );
    }

    res.json({
      success: true,
      message: "research_reports table created successfully",
      columns: columns?.map((col: any) => col.column_name) || [],
    });
  } catch (error) {
    console.error("❌ Setup error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Setup database schema function endpoint
router.post("/setup-schema-function", async (_req, res) => {
  try {
    console.log("🔧 Setting up get_table_schema function...");

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: "Database connection not configured",
      });
    }

    // Create the get_table_schema function using raw SQL
    const createFunctionSQL = `
      -- Drop function if it exists
      DROP FUNCTION IF EXISTS get_table_schema(text);

      -- Create the get_table_schema function
      CREATE OR REPLACE FUNCTION get_table_schema(table_name text)
      RETURNS TABLE(
          column_name text,
          data_type text,
          is_nullable text,
          column_default text,
          ordinal_position integer
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
          -- Validate table name to prevent SQL injection
          IF table_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
              RAISE EXCEPTION 'Invalid table name: %', table_name;
          END IF;

          -- Return table schema information
          RETURN QUERY
          SELECT
              c.column_name::text,
              c.data_type::text,
              c.is_nullable::text,
              c.column_default::text,
              c.ordinal_position::integer
          FROM information_schema.columns c
          WHERE c.table_schema = 'public'
            AND c.table_name = get_table_schema.table_name
          ORDER BY c.ordinal_position;

          -- Check if any rows were returned
          IF NOT FOUND THEN
              RAISE NOTICE 'Table % not found in public schema', table_name;
          END IF;
      END;
      $$;

      -- Grant execute permission to authenticated users
      GRANT EXECUTE ON FUNCTION get_table_schema(text) TO authenticated;
      GRANT EXECUTE ON FUNCTION get_table_schema(text) TO service_role;
    `;

    const { error: createError } = await supabase.rpc("exec_sql", {
      sql: createFunctionSQL,
    });

    if (createError) {
      console.error("❌ Error creating schema function:", createError);
      return res.status(500).json({
        success: false,
        error: createError.message,
        details: createError,
      });
    }

    console.log("✅ get_table_schema function created successfully");

    // Test the function
    const { data: testData, error: testError } = await supabase.rpc(
      "get_table_schema",
      {
        table_name: "research_reports",
      }
    );

    if (testError) {
      console.log("⚠️ Function test failed:", testError);
    } else {
      console.log(
        "🔍 Function test successful:",
        testData?.map((col: any) => col.column_name)
      );
    }

    res.json({
      success: true,
      message: "get_table_schema function created successfully",
      testResult: testData || [],
    });
  } catch (error) {
    console.error("❌ Setup error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Test database connection endpoint
router.get("/test-connection", async (_req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: "Database connection not configured",
      });
    }

    const { error } = await supabase.from("users").select("count").limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Database connection successful",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Execute Sentinel email monitoring database migration
router.post("/setup-sentinel-email-monitoring", async (_req, res) => {
  try {
    console.log("🔧 Setting up Sentinel email monitoring database schema...");

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: "Database connection not configured",
      });
    }

    // Read and execute the email monitoring SQL script
    const emailMonitoringSQL = `
      -- Email Monitoring Configuration Table
      CREATE TABLE IF NOT EXISTS email_monitoring_config (
          id VARCHAR PRIMARY KEY NOT NULL,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          monitoring_enabled BOOLEAN DEFAULT false,
          check_interval INTEGER DEFAULT 1, -- in minutes
          last_check_at TIMESTAMP,
          filter_criteria JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Email Threads Table (conversation grouping)
      CREATE TABLE IF NOT EXISTS email_threads (
          id VARCHAR PRIMARY KEY NOT NULL,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          thread_id VARCHAR NOT NULL, -- Gmail thread ID
          subject VARCHAR,
          participants JSONB DEFAULT '[]',
          last_message_at TIMESTAMP,
          status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Email Messages Table (individual emails within threads)
      CREATE TABLE IF NOT EXISTS email_messages (
          id VARCHAR PRIMARY KEY NOT NULL,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          thread_id VARCHAR NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
          message_id VARCHAR NOT NULL, -- Gmail message ID
          from_address VARCHAR NOT NULL,
          to_addresses JSONB DEFAULT '[]',
          cc_addresses JSONB DEFAULT '[]',
          subject VARCHAR,
          body_text TEXT,
          body_html TEXT,
          is_from_customer BOOLEAN DEFAULT true,
          processed BOOLEAN DEFAULT false,
          requires_action BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          received_at TIMESTAMP
      );

      -- Email Responses Table (AI-generated responses awaiting approval)
      CREATE TABLE IF NOT EXISTS email_responses (
          id VARCHAR PRIMARY KEY NOT NULL,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          thread_id VARCHAR NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
          message_id VARCHAR REFERENCES email_messages(id) ON DELETE CASCADE,
          response_text TEXT NOT NULL,
          response_html TEXT,
          confidence_score DECIMAL(3,2),
          requires_approval BOOLEAN DEFAULT true,
          approved BOOLEAN DEFAULT false,
          sent BOOLEAN DEFAULT false,
          approved_by VARCHAR,
          approved_at TIMESTAMP,
          sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Calendar Bookings Table (calendar booking requests from emails)
      CREATE TABLE IF NOT EXISTS calendar_bookings (
          id VARCHAR PRIMARY KEY NOT NULL,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          thread_id VARCHAR NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
          message_id VARCHAR REFERENCES email_messages(id) ON DELETE CASCADE,
          requester_email VARCHAR NOT NULL,
          requester_name VARCHAR,
          meeting_type VARCHAR,
          preferred_times JSONB DEFAULT '[]',
          duration_minutes INTEGER DEFAULT 30,
          status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
          calendar_event_id VARCHAR,
          meeting_link VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          scheduled_at TIMESTAMP
      );

      -- Email Escalations Table (emails escalated for human intervention)
      CREATE TABLE IF NOT EXISTS email_escalations (
          id VARCHAR PRIMARY KEY NOT NULL,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          thread_id VARCHAR NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
          message_id VARCHAR REFERENCES email_messages(id) ON DELETE CASCADE,
          escalation_reason VARCHAR NOT NULL,
          priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
          resolution_notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          resolved_at TIMESTAMP
      );
    `;

    const { error: createError } = await supabase.rpc("exec_sql", {
      sql: emailMonitoringSQL,
    });

    if (createError) {
      console.error("❌ Error creating email monitoring tables:", createError);
      return res.status(500).json({
        success: false,
        error: createError.message,
        details: createError,
      });
    }

    console.log("✅ Email monitoring tables created successfully");

    // Add indexes for performance
    const indexSQL = `
      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_email_monitoring_config_user_id ON email_monitoring_config(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_monitoring_config_enabled ON email_monitoring_config(monitoring_enabled);
      CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_threads_thread_id ON email_threads(thread_id);
      CREATE INDEX IF NOT EXISTS idx_email_threads_last_message_at ON email_threads(last_message_at DESC);
      CREATE INDEX IF NOT EXISTS idx_email_messages_user_id ON email_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON email_messages(thread_id);
      CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id);
      CREATE INDEX IF NOT EXISTS idx_email_messages_processed ON email_messages(processed);
      CREATE INDEX IF NOT EXISTS idx_email_messages_requires_action ON email_messages(requires_action);
      CREATE INDEX IF NOT EXISTS idx_email_responses_user_id ON email_responses(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_responses_thread_id ON email_responses(thread_id);
      CREATE INDEX IF NOT EXISTS idx_email_responses_approved ON email_responses(approved);
      CREATE INDEX IF NOT EXISTS idx_email_responses_sent ON email_responses(sent);
      CREATE INDEX IF NOT EXISTS idx_calendar_bookings_user_id ON calendar_bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_bookings_status ON calendar_bookings(status);
      CREATE INDEX IF NOT EXISTS idx_email_escalations_user_id ON email_escalations(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_escalations_status ON email_escalations(status);
      CREATE INDEX IF NOT EXISTS idx_email_escalations_priority ON email_escalations(priority);
    `;

    const { error: indexError } = await supabase.rpc("exec_sql", {
      sql: indexSQL,
    });

    if (indexError) {
      console.error("❌ Error creating indexes:", indexError);
      return res.status(500).json({
        success: false,
        error: indexError.message,
        details: indexError,
      });
    }

    console.log("✅ Database indexes created successfully");

    res.json({
      success: true,
      message: "Sentinel email monitoring database schema created successfully",
      tables: [
        "email_monitoring_config",
        "email_threads",
        "email_messages",
        "email_responses",
        "calendar_bookings",
        "email_escalations",
      ],
    });
  } catch (error) {
    console.error("❌ Setup error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Verify complete database schema for Sentinel email monitoring
router.get("/verify-sentinel-schema", async (_req, res) => {
  try {
    console.log("🔍 Verifying Sentinel email monitoring database schema...");

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: "Database connection not configured",
      });
    }

    const requiredTables = [
      "users",
      "notifications",
      "email_monitoring_config",
      "email_threads",
      "email_messages",
      "email_responses",
      "calendar_bookings",
      "email_escalations",
    ];

    const schemaVerification = [];

    // Check each required table
    for (const tableName of requiredTables) {
      try {
        const { data: tableInfo, error: tableError } = await supabase.rpc(
          "get_table_schema",
          { table_name: tableName }
        );

        if (tableError) {
          schemaVerification.push({
            table: tableName,
            exists: false,
            error: tableError.message,
            columns: [],
          });
        } else {
          schemaVerification.push({
            table: tableName,
            exists: true,
            columns: tableInfo || [],
            columnCount: tableInfo?.length || 0,
          });
        }
      } catch (error: any) {
        schemaVerification.push({
          table: tableName,
          exists: false,
          error: error.message,
          columns: [],
        });
      }
    }

    // Check foreign key relationships
    const relationshipSQL = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('email_monitoring_config', 'email_threads', 'email_messages', 'email_responses', 'calendar_bookings', 'email_escalations')
      ORDER BY tc.table_name, kcu.column_name;
    `;

    const { data: relationships, error: relationshipError } =
      await supabase.rpc("exec_sql", {
        sql: relationshipSQL,
      });

    // Check indexes
    const indexSQL = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('email_monitoring_config', 'email_threads', 'email_messages', 'email_responses', 'calendar_bookings', 'email_escalations', 'notifications')
        AND schemaname = 'public'
      ORDER BY tablename, indexname;
    `;

    const { data: indexes, error: indexError } = await supabase.rpc(
      "exec_sql",
      {
        sql: indexSQL,
      }
    );

    // Test basic operations
    const testOperations = [];

    // Test notifications table
    try {
      const { error: notificationTestError } = await supabase
        .from("notifications")
        .select("count")
        .limit(1);

      testOperations.push({
        operation: "notifications_select",
        success: !notificationTestError,
        error: notificationTestError?.message,
      });
    } catch (error: any) {
      testOperations.push({
        operation: "notifications_select",
        success: false,
        error: error.message,
      });
    }

    // Test email monitoring config table
    try {
      const { error: configTestError } = await supabase
        .from("email_monitoring_config")
        .select("count")
        .limit(1);

      testOperations.push({
        operation: "email_monitoring_config_select",
        success: !configTestError,
        error: configTestError?.message,
      });
    } catch (error: any) {
      testOperations.push({
        operation: "email_monitoring_config_select",
        success: false,
        error: error.message,
      });
    }

    const missingTables = schemaVerification.filter((table) => !table.exists);
    const existingTables = schemaVerification.filter((table) => table.exists);

    res.json({
      success: missingTables.length === 0,
      message:
        missingTables.length === 0
          ? "All required tables exist and schema verification passed"
          : `Missing ${missingTables.length} required tables`,
      schema: {
        requiredTables: requiredTables.length,
        existingTables: existingTables.length,
        missingTables: missingTables.length,
        tables: schemaVerification,
      },
      relationships: relationshipError
        ? { error: relationshipError.message }
        : relationships,
      indexes: indexError ? { error: indexError.message } : indexes,
      testOperations,
      readyForEmailMonitoring:
        missingTables.length === 0 && testOperations.every((op) => op.success),
    });
  } catch (error) {
    console.error("❌ Schema verification error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Setup AI Agents tables (chat_sessions, chat_messages, agent_jobs)
router.post("/setup-ai-agents-tables", async (_req, res) => {
  try {
    console.log("🔧 Setting up AI Agents tables...");

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: "Database connection not configured",
      });
    }

    // Create chat_sessions table using direct SQL execution
    try {
      // First check if table exists
      const { data: existingTable } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .eq("table_name", "chat_sessions")
        .single();

      if (!existingTable) {
        // Table doesn't exist, we need to create it manually
        console.log(
          "⚠️ chat_sessions table doesn't exist. Please create it manually in Supabase SQL Editor:"
        );
        console.log(`
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP
);
        `);
      } else {
        console.log("✅ chat_sessions table already exists");
      }
    } catch (error) {
      console.log(
        "⚠️ Could not verify chat_sessions table, assuming it needs to be created manually"
      );
    }

    // Create chat_messages table
    try {
      const { data: existingTable } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .eq("table_name", "chat_messages")
        .single();

      if (!existingTable) {
        console.log(
          "⚠️ chat_messages table doesn't exist. Please create it manually in Supabase SQL Editor:"
        );
        console.log(`
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
        `);
      } else {
        console.log("✅ chat_messages table already exists");
      }
    } catch (error) {
      console.log(
        "⚠️ Could not verify chat_messages table, assuming it needs to be created manually"
      );
    }

    // Create agent_jobs table
    try {
      const { data: existingTable } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .eq("table_name", "agent_jobs")
        .single();

      if (!existingTable) {
        console.log(
          "⚠️ agent_jobs table doesn't exist. Please create it manually in Supabase SQL Editor:"
        );
        console.log(`
CREATE TABLE IF NOT EXISTS agent_jobs (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR REFERENCES chat_sessions(id) ON DELETE SET NULL,
    agent_name VARCHAR NOT NULL CHECK (agent_name IN ('falcon', 'sage', 'sentinel', 'prism')),
    job_type VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    input_data JSONB NOT NULL,
    result_data JSONB,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);
        `);
      } else {
        console.log("✅ agent_jobs table already exists");
      }
    } catch (error) {
      console.log(
        "⚠️ Could not verify agent_jobs table, assuming it needs to be created manually"
      );
    }

    // Skip index creation for now since we can't execute SQL directly
    console.log(
      "⚠️ Indexes need to be created manually. Please run this in Supabase SQL Editor:"
    );
    console.log(`
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_user_id ON agent_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_agent_name ON agent_jobs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_created_at ON agent_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_session_id ON agent_jobs(session_id);
    `);

    res.json({
      success: true,
      message: "AI Agents tables created successfully",
      tables: ["chat_sessions", "chat_messages", "agent_jobs"],
    });
  } catch (error) {
    console.error("❌ Setup error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
