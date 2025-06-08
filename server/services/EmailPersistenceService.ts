import { supabase } from "../db";
import { v4 as uuidv4 } from "uuid";

export interface EmailThread {
  id: string;
  user_id: string;
  thread_id: string;
  subject?: string;
  participants: string[];
  status: "active" | "completed" | "archived";
  classification?: "sales" | "support" | "spam" | "other";
  is_calendar_request: boolean;
  requires_response: boolean;
  escalated: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
}

export interface EmailMessage {
  id: string;
  user_id: string;
  thread_id: string;
  message_id: string;
  from_address: string;
  to_addresses: string[];
  cc_addresses: string[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  is_from_customer: boolean;
  processed: boolean;
  requires_action: boolean;
  created_at: string;
  received_at?: string;
}

export interface EmailResponse {
  id: string;
  user_id: string;
  thread_id: string;
  subject: string;
  body: string;
  status: "pending_approval" | "approved" | "sent" | "rejected";
  confidence_score: number;
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  created_at: string;
}

export interface CalendarBooking {
  id: string;
  user_id: string;
  thread_id: string;
  requester_email: string;
  requester_name?: string;
  requested_datetime?: string;
  duration_minutes: number;
  meeting_type: string;
  status: "pending" | "confirmed" | "cancelled";
  calendar_event_id?: string;
  booking_link?: string;
  created_at: string;
  confirmed_at?: string;
}

export interface EmailEscalation {
  id: string;
  user_id: string;
  thread_id: string;
  escalation_reason: string;
  escalation_type:
    | "complex_query"
    | "high_value"
    | "technical_issue"
    | "manual_review";
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_review" | "resolved";
  assigned_to?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

export class EmailPersistenceService {
  /**
   * Save or update an email thread
   */
  async saveEmailThread(
    threadData: Partial<EmailThread>
  ): Promise<EmailThread> {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    try {
      const threadId = threadData.id || uuidv4();
      const now = new Date().toISOString();

      const thread: Partial<EmailThread> = {
        id: threadId,
        user_id: threadData.user_id!,
        thread_id: threadData.thread_id!,
        subject: threadData.subject,
        participants: threadData.participants || [],
        status: threadData.status || "active",
        classification: threadData.classification,
        is_calendar_request: threadData.is_calendar_request || false,
        requires_response: threadData.requires_response || false,
        escalated: threadData.escalated || false,
        created_at: threadData.created_at || now,
        updated_at: now,
        last_activity_at: threadData.last_activity_at || now,
      };

      const { data, error } = await supabase
        .from("email_threads")
        .upsert(thread, { onConflict: "thread_id,user_id" })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save email thread: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error("❌ Error saving email thread:", error);
      throw error;
    }
  }

  /**
   * Save an email message
   */
  async saveEmailMessage(
    messageData: Partial<EmailMessage>
  ): Promise<EmailMessage> {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    try {
      const messageId = messageData.id || uuidv4();
      const now = new Date().toISOString();

      const message: Partial<EmailMessage> = {
        id: messageId,
        user_id: messageData.user_id!,
        thread_id: messageData.thread_id!,
        message_id: messageData.message_id!,
        from_address: messageData.from_address!,
        to_addresses: messageData.to_addresses || [],
        cc_addresses: messageData.cc_addresses || [],
        subject: messageData.subject,
        body_text: messageData.body_text,
        body_html: messageData.body_html,
        is_from_customer: messageData.is_from_customer !== false,
        processed: messageData.processed || false,
        requires_action: messageData.requires_action || false,
        created_at: messageData.created_at || now,
        received_at: messageData.received_at || now,
      };

      const { data, error } = await supabase
        .from("email_messages")
        .upsert(message, { onConflict: "message_id,user_id" })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save email message: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error("❌ Error saving email message:", error);
      throw error;
    }
  }

  /**
   * Save an email response
   */
  async saveEmailResponse(
    responseData: Partial<EmailResponse>
  ): Promise<EmailResponse> {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    try {
      const responseId = responseData.id || uuidv4();
      const now = new Date().toISOString();

      const response: Partial<EmailResponse> = {
        id: responseId,
        user_id: responseData.user_id!,
        thread_id: responseData.thread_id!,
        subject: responseData.subject!,
        body: responseData.body!,
        status: responseData.status || "pending_approval",
        confidence_score: responseData.confidence_score || 0.7,
        requires_approval: responseData.requires_approval !== false,
        approved_by: responseData.approved_by,
        approved_at: responseData.approved_at,
        sent_at: responseData.sent_at,
        created_at: responseData.created_at || now,
      };

      const { data, error } = await supabase
        .from("email_responses")
        .insert(response)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save email response: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error("❌ Error saving email response:", error);
      throw error;
    }
  }

  /**
   * Save a calendar booking
   */
  async saveCalendarBooking(
    bookingData: Partial<CalendarBooking>
  ): Promise<CalendarBooking> {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    try {
      const bookingId = bookingData.id || uuidv4();
      const now = new Date().toISOString();

      const booking: Partial<CalendarBooking> = {
        id: bookingId,
        user_id: bookingData.user_id!,
        thread_id: bookingData.thread_id!,
        requester_email: bookingData.requester_email!,
        requester_name: bookingData.requester_name,
        requested_datetime: bookingData.requested_datetime,
        duration_minutes: bookingData.duration_minutes || 30,
        meeting_type: bookingData.meeting_type || "meeting",
        status: bookingData.status || "pending",
        calendar_event_id: bookingData.calendar_event_id,
        booking_link: bookingData.booking_link,
        created_at: bookingData.created_at || now,
        confirmed_at: bookingData.confirmed_at,
      };

      const { data, error } = await supabase
        .from("calendar_bookings")
        .insert(booking)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save calendar booking: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error("❌ Error saving calendar booking:", error);
      throw error;
    }
  }

  /**
   * Save an email escalation
   */
  async saveEmailEscalation(
    escalationData: Partial<EmailEscalation>
  ): Promise<EmailEscalation> {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    try {
      const escalationId = escalationData.id || uuidv4();
      const now = new Date().toISOString();

      const escalation: Partial<EmailEscalation> = {
        id: escalationId,
        user_id: escalationData.user_id!,
        thread_id: escalationData.thread_id!,
        escalation_reason: escalationData.escalation_reason!,
        escalation_type: escalationData.escalation_type || "manual_review",
        priority: escalationData.priority || "medium",
        status: escalationData.status || "pending",
        assigned_to: escalationData.assigned_to,
        resolved_at: escalationData.resolved_at,
        resolution_notes: escalationData.resolution_notes,
        created_at: escalationData.created_at || now,
      };

      const { data, error } = await supabase
        .from("email_escalations")
        .insert(escalation)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save email escalation: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error("❌ Error saving email escalation:", error);
      throw error;
    }
  }

  /**
   * Get email thread by Gmail thread ID
   */
  async getEmailThreadByGmailId(
    userId: string,
    gmailThreadId: string
  ): Promise<EmailThread | null> {
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("email_threads")
        .select("*")
        .eq("user_id", userId)
        .eq("thread_id", gmailThreadId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error("❌ Error getting email thread:", error);
      return null;
    }
  }

  /**
   * Get email messages for a thread
   */
  async getEmailMessages(
    userId: string,
    threadId: string
  ): Promise<EmailMessage[]> {
    if (!supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("email_messages")
        .select("*")
        .eq("user_id", userId)
        .eq("thread_id", threadId)
        .order("received_at", { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error("❌ Error getting email messages:", error);
      return [];
    }
  }

  /**
   * Get pending email responses for approval
   */
  async getPendingResponses(userId: string): Promise<EmailResponse[]> {
    if (!supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("email_responses")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error("❌ Error getting pending responses:", error);
      return [];
    }
  }

  /**
   * Update email response status
   */
  async updateResponseStatus(
    responseId: string,
    status: EmailResponse["status"],
    userId: string,
    approvedBy?: string
  ): Promise<EmailResponse | null> {
    if (!supabase) {
      return null;
    }

    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "approved" && approvedBy) {
        updateData.approved_by = approvedBy;
        updateData.approved_at = new Date().toISOString();
      }

      if (status === "sent") {
        updateData.sent_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("email_responses")
        .update(updateData)
        .eq("id", responseId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error("❌ Error updating response status:", error);
      return null;
    }
  }
}
