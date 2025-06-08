import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  Calendar, 
  AlertTriangle,
  Edit3,
  Send,
  Eye
} from "lucide-react";

interface EmailResponse {
  id: string;
  threadId: string;
  fromAddress: string;
  subject: string;
  originalEmail: string;
  generatedResponse: string;
  responseType: "information" | "calendar" | "escalation";
  approvalStatus: "pending" | "approved" | "rejected" | "sent";
  createdAt: string;
  metadata?: {
    confidence?: number;
    reasoning?: string;
    calendarDetails?: {
      eventType: string;
      requestedDate?: string;
      duration?: number;
    };
  };
}

interface EmailApprovalDashboardProps {
  className?: string;
}

export function EmailApprovalDashboard({ className }: EmailApprovalDashboardProps) {
  const [pendingResponses, setPendingResponses] = useState<EmailResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<EmailResponse | null>(null);
  const [editedResponse, setEditedResponse] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingResponses();
    // Set up polling for new responses
    const interval = setInterval(fetchPendingResponses, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingResponses = async () => {
    try {
      const response = await fetch("/api/ai-agents/sentinel/pending-responses", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingResponses(data.responses || []);
      }
    } catch (error) {
      console.error("Error fetching pending responses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (responseId: string, finalContent?: string) => {
    try {
      const response = await fetch(`/api/ai-agents/sentinel/approve-response/${responseId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          responseContent: finalContent,
        }),
      });

      if (response.ok) {
        setPendingResponses(prev => 
          prev.filter(r => r.id !== responseId)
        );
        setSelectedResponse(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error approving response:", error);
    }
  };

  const handleReject = async (responseId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/ai-agents/sentinel/reject-response/${responseId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          rejectionReason: reason,
        }),
      });

      if (response.ok) {
        setPendingResponses(prev => 
          prev.filter(r => r.id !== responseId)
        );
        setSelectedResponse(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error rejecting response:", error);
    }
  };

  const startEditing = (response: EmailResponse) => {
    setSelectedResponse(response);
    setEditedResponse(response.generatedResponse);
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (selectedResponse) {
      handleApprove(selectedResponse.id, editedResponse);
    }
  };

  const getResponseTypeIcon = (type: string) => {
    switch (type) {
      case "information": return <Mail className="h-4 w-4 text-blue-500" />;
      case "calendar": return <Calendar className="h-4 w-4 text-green-500" />;
      case "escalation": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getResponseTypeBadge = (type: string) => {
    const colors = {
      information: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      calendar: "bg-green-500/20 text-green-400 border-green-500/30",
      escalation: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || colors.information}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-white/60">Loading pending responses...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Email Approval Dashboard</h2>
        <Badge variant="outline" className="text-white border-white/20">
          {pendingResponses.length} Pending
        </Badge>
      </div>

      {pendingResponses.length === 0 ? (
        <Card className="bg-black border-white/10">
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center text-white/60">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>No pending responses</p>
              <p className="text-sm">All emails have been processed</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Response List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Pending Responses</h3>
            {pendingResponses.map((response) => (
              <Card 
                key={response.id} 
                className={`bg-black border-white/10 cursor-pointer transition-all duration-200 hover:border-[#C1FF72]/30 ${
                  selectedResponse?.id === response.id ? "border-[#C1FF72]/50 bg-[#C1FF72]/5" : ""
                }`}
                onClick={() => setSelectedResponse(response)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getResponseTypeIcon(response.responseType)}
                      <span className="font-medium text-white text-sm">
                        {response.fromAddress}
                      </span>
                    </div>
                    {getResponseTypeBadge(response.responseType)}
                  </div>
                  <CardTitle className="text-sm text-white/80 line-clamp-2">
                    {response.subject}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>{new Date(response.createdAt).toLocaleString()}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Pending</span>
                    </div>
                  </div>
                  {response.metadata?.confidence && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">Confidence</span>
                        <span className="text-white/80">{Math.round(response.metadata.confidence * 100)}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                        <div 
                          className="bg-[#C1FF72] h-1 rounded-full transition-all duration-300"
                          style={{ width: `${response.metadata.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Response Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Response Details</h3>
            {selectedResponse ? (
              <Card className="bg-black border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">
                      Response to {selectedResponse.fromAddress}
                    </CardTitle>
                    {getResponseTypeBadge(selectedResponse.responseType)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Original Email */}
                  <div>
                    <h4 className="text-sm font-medium text-white/80 mb-2">Original Email</h4>
                    <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70 max-h-32 overflow-y-auto">
                      {selectedResponse.originalEmail}
                    </div>
                  </div>

                  {/* Generated Response */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-white/80">Generated Response</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(selectedResponse)}
                        className="text-xs border-white/20 text-white/70 hover:bg-white/10"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    {isEditing && selectedResponse ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editedResponse}
                          onChange={(e) => setEditedResponse(e.target.value)}
                          className="bg-white/10 border-white/20 text-white min-h-[120px] resize-none"
                          placeholder="Edit the response..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveEdit}
                            className="bg-[#C1FF72] text-black hover:bg-[#A8E85A]"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Approve & Send
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            className="border-white/20 text-white/70 hover:bg-white/10"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70 max-h-40 overflow-y-auto">
                        {selectedResponse.generatedResponse}
                      </div>
                    )}
                  </div>

                  {/* Calendar Details */}
                  {selectedResponse.responseType === "calendar" && selectedResponse.metadata?.calendarDetails && (
                    <div>
                      <h4 className="text-sm font-medium text-white/80 mb-2">Calendar Details</h4>
                      <div className="bg-green-500/10 rounded-lg p-3 text-sm text-green-400">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-green-300">Event Type:</span>
                            <span className="ml-2">{selectedResponse.metadata.calendarDetails.eventType}</span>
                          </div>
                          {selectedResponse.metadata.calendarDetails.requestedDate && (
                            <div>
                              <span className="text-green-300">Date:</span>
                              <span className="ml-2">{selectedResponse.metadata.calendarDetails.requestedDate}</span>
                            </div>
                          )}
                          {selectedResponse.metadata.calendarDetails.duration && (
                            <div>
                              <span className="text-green-300">Duration:</span>
                              <span className="ml-2">{selectedResponse.metadata.calendarDetails.duration} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reasoning */}
                  {selectedResponse.metadata?.reasoning && (
                    <div>
                      <h4 className="text-sm font-medium text-white/80 mb-2">AI Reasoning</h4>
                      <div className="bg-blue-500/10 rounded-lg p-3 text-sm text-blue-400">
                        {selectedResponse.metadata.reasoning}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isEditing && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => handleApprove(selectedResponse.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Send
                      </Button>
                      <Button
                        onClick={() => handleReject(selectedResponse.id)}
                        variant="destructive"
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-black border-white/10">
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-white/60">
                    <Eye className="h-8 w-8 mx-auto mb-2" />
                    <p>Select a response to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
