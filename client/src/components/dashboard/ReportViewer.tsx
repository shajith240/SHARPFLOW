import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Download, 
  Mail, 
  ExternalLink,
  FileText,
  Building,
  MapPin,
  Globe,
  Linkedin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResearchReport } from "@/types/lead-generation";

interface ReportViewerProps {
  report: ResearchReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportViewer({ report, isOpen, onClose }: ReportViewerProps) {
  if (!report || !isOpen) return null;

  const handleEmailReport = () => {
    console.log(`Emailing report ${report.id}`);
    // Implement email functionality
  };

  const handleExportReport = () => {
    // Create a downloadable HTML file
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${report.reportName}</title>
        <style>
          ${getReportStyles()}
        </style>
      </head>
      <body>
        ${report.htmlContent}
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.reportName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="w-full max-w-4xl max-h-[90vh] bg-dashboard-bg-secondary border border-dashboard-border-primary rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-dashboard-border-primary bg-dashboard-bg-tertiary">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-dashboard-primary/20">
                  <FileText className="w-5 h-5 text-dashboard-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-dashboard-text-primary">
                    {report.reportName}
                  </h2>
                  <p className="text-sm text-dashboard-text-secondary">
                    Generated on {new Date(report.generatedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEmailReport}
                  className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportReport}
                  className="border-dashboard-border-primary text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export HTML
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-interactive-hover"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick Insights Bar */}
            <div className="p-4 bg-dashboard-bg-tertiary/50 border-b border-dashboard-border-primary">
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="border-dashboard-border-primary text-dashboard-text-primary">
                  <Building className="w-3 h-3 mr-1" />
                  {report.insights.companySize}
                </Badge>
                <Badge variant="outline" className="border-dashboard-border-primary text-dashboard-text-primary">
                  <MapPin className="w-3 h-3 mr-1" />
                  {report.insights.location}
                </Badge>
                <Badge variant="outline" className="border-dashboard-border-primary text-dashboard-text-primary">
                  <Globe className="w-3 h-3 mr-1" />
                  {report.insights.industry}
                </Badge>
                <Badge variant="outline" className="border-dashboard-border-primary text-dashboard-text-primary">
                  <Linkedin className="w-3 h-3 mr-1" />
                  {report.insights.socialActivity} Activity
                </Badge>
                {report.insights.contactInfo && (
                  <Badge className="bg-dashboard-secondary/20 text-dashboard-secondary border-dashboard-secondary/30">
                    Contact Info Available
                  </Badge>
                )}
              </div>
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-auto p-6">
              <div 
                className="report-content"
                dangerouslySetInnerHTML={{ __html: report.htmlContent || '' }}
                style={{ 
                  color: 'var(--dashboard-text-primary)',
                  lineHeight: '1.6'
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Styles for the HTML report content
function getReportStyles(): string {
  return `
    .research-report {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
    }
    
    .report-header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #38B6FF;
    }
    
    .report-header h1 {
      font-size: 2rem;
      font-weight: bold;
      color: #38B6FF;
      margin-bottom: 0.5rem;
    }
    
    .report-header h2 {
      font-size: 1.5rem;
      color: #C1FF72;
      margin-bottom: 0.5rem;
    }
    
    .report-date {
      color: #94a3b8;
      font-size: 0.9rem;
    }
    
    .report-section {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .report-section h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #38B6FF;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(56, 182, 255, 0.3);
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .info-item {
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .info-item strong {
      color: #C1FF72;
    }
    
    .contact-info p {
      margin-bottom: 0.5rem;
    }
    
    .activity-list, .recommendations {
      margin-top: 1rem;
      padding-left: 1.5rem;
    }
    
    .activity-list li, .recommendations li {
      margin-bottom: 0.5rem;
      color: #cbd5e1;
    }
    
    a {
      color: #38B6FF;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      .research-report {
        padding: 1rem;
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
      
      .report-header h1 {
        font-size: 1.5rem;
      }
      
      .report-header h2 {
        font-size: 1.25rem;
      }
    }
  `;
}
