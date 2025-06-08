import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  location?: string;
}

export interface CalendarAvailability {
  available: boolean;
  conflictingEvents?: any[];
  suggestedTimes?: string[];
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "http://localhost:3000/api/auth/google/callback"
    );

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client });
  }

  /**
   * Check calendar availability for a specific time slot
   */
  async checkAvailability(
    startTime: string,
    endTime: string,
    calendarId: string = "primary"
  ): Promise<CalendarAvailability> {
    try {
      console.log(
        `📅 Checking calendar availability from ${startTime} to ${endTime}`
      );

      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startTime,
          timeMax: endTime,
          items: [{ id: calendarId }],
        },
      });

      const busyTimes = response.data.calendars[calendarId]?.busy || [];
      const available = busyTimes.length === 0;

      console.log(
        `📅 Availability check result: ${available ? "Available" : "Busy"}`
      );

      if (!available) {
        console.log(`📅 Conflicting events:`, busyTimes);
      }

      return {
        available,
        conflictingEvents: busyTimes,
        suggestedTimes: available
          ? []
          : await this.getSuggestedTimes(startTime, endTime),
      };
    } catch (error) {
      console.error("Error checking calendar availability:", error);
      throw new Error(
        `Failed to check calendar availability: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    eventDetails: CalendarEvent,
    calendarId: string = "primary"
  ): Promise<any> {
    try {
      console.log(`📅 Creating calendar event:`, {
        summary: eventDetails.summary,
        start: eventDetails.start.dateTime,
        end: eventDetails.end.dateTime,
        attendees: eventDetails.attendees?.map((a) => a.email),
      });

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: {
          summary: eventDetails.summary,
          description: eventDetails.description,
          start: eventDetails.start,
          end: eventDetails.end,
          attendees: eventDetails.attendees,
          location: eventDetails.location,
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 24 * 60 }, // 1 day before
              { method: "popup", minutes: 30 }, // 30 minutes before
            ],
          },
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
        conferenceDataVersion: 1,
        sendUpdates: "all", // Send email invitations to attendees
      });

      const createdEvent = response.data;
      console.log(`✅ Calendar event created successfully:`, {
        id: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        hangoutLink: createdEvent.hangoutLink,
      });

      return createdEvent;
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw new Error(
        `Failed to create calendar event: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    eventDetails: Partial<CalendarEvent>,
    calendarId: string = "primary"
  ): Promise<any> {
    try {
      console.log(`📅 Updating calendar event ${eventId}`);

      const response = await this.calendar.events.patch({
        calendarId,
        eventId,
        requestBody: eventDetails,
        sendUpdates: "all",
      });

      console.log(`✅ Calendar event updated successfully`);
      return response.data;
    } catch (error) {
      console.error("Error updating calendar event:", error);
      throw new Error(
        `Failed to update calendar event: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(
    eventId: string,
    calendarId: string = "primary"
  ): Promise<void> {
    try {
      console.log(`📅 Deleting calendar event ${eventId}`);

      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: "all",
      });

      console.log(`✅ Calendar event deleted successfully`);
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      throw new Error(
        `Failed to delete calendar event: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get suggested alternative times when the requested time is not available
   */
  private async getSuggestedTimes(
    originalStart: string,
    originalEnd: string
  ): Promise<string[]> {
    const suggestions: string[] = [];
    const startDate = new Date(originalStart);
    const duration = new Date(originalEnd).getTime() - startDate.getTime();

    // Suggest next 3 available slots (same time next 3 days)
    for (let i = 1; i <= 3; i++) {
      const suggestedStart = new Date(
        startDate.getTime() + i * 24 * 60 * 60 * 1000
      );
      const suggestedEnd = new Date(suggestedStart.getTime() + duration);

      try {
        const availability = await this.checkAvailability(
          suggestedStart.toISOString(),
          suggestedEnd.toISOString()
        );

        if (availability.available) {
          suggestions.push(suggestedStart.toISOString());
        }
      } catch (error) {
        console.error(`Error checking suggested time ${i}:`, error);
      }
    }

    return suggestions;
  }

  /**
   * Get calendar events for a specific time range
   */
  async getEvents(
    startTime: string,
    endTime: string,
    calendarId: string = "primary"
  ): Promise<any[]> {
    try {
      console.log(
        `📅 Fetching calendar events from ${startTime} to ${endTime}`
      );

      const response = await this.calendar.events.list({
        calendarId,
        timeMin: startTime,
        timeMax: endTime,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];
      console.log(`📅 Found ${events.length} calendar events`);

      return events;
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      throw new Error(
        `Failed to fetch calendar events: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
