import { Card, CardContent } from "@/components/ui/card";
import { 
  Headphones, 
  TrendingUp, 
  Settings, 
  Megaphone, 
  DollarSign, 
  Users,
  ArrowRight,
  Check
} from "lucide-react";

const services = [
  {
    icon: Headphones,
    title: "Customer Service AI",
    description: "24/7 intelligent chatbots that handle customer inquiries, reducing response time by 80% and improving satisfaction scores.",
    features: [
      "Multi-language support",
      "CRM integration", 
      "Real-time analytics"
    ]
  },
  {
    icon: TrendingUp,
    title: "Data Analytics AI",
    description: "Transform raw data into actionable insights with predictive analytics and automated reporting systems.",
    features: [
      "Predictive modeling",
      "Custom dashboards",
      "Automated alerts"
    ]
  },
  {
    icon: Settings,
    title: "Process Automation",
    description: "Streamline repetitive tasks and workflows, reducing manual effort by up to 90% while ensuring accuracy.",
    features: [
      "Workflow optimization",
      "API integrations",
      "Error reduction"
    ]
  },
  {
    icon: Megaphone,
    title: "Marketing AI",
    description: "Personalized campaigns, lead scoring, and content optimization that increase conversion rates by 3x.",
    features: [
      "Lead qualification",
      "Content generation",
      "A/B testing"
    ]
  },
  {
    icon: DollarSign,
    title: "Financial AI",
    description: "Automated invoicing, expense tracking, and financial forecasting for better cash flow management.",
    features: [
      "Invoice automation",
      "Fraud detection",
      "Budget forecasting"
    ]
  },
  {
    icon: Users,
    title: "HR & Recruitment AI",
    description: "Streamline hiring processes with resume screening, candidate matching, and interview scheduling automation.",
    features: [
      "Resume parsing",
      "Candidate scoring",
      "Interview automation"
    ]
  }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-black mb-4">AI Automation Solutions</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From customer service to data analysis, our AI solutions streamline your operations and drive measurable results.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card 
                key={index} 
                className="bg-gray-50 border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
              >
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-[#38B6FF] rounded-xl flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-4">{service.title}</h3>
                  <p className="text-gray-600 mb-6">
                    {service.description}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                        <Check className="w-4 h-4 text-[#C1FF72] mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button className="text-[#38B6FF] font-semibold hover:text-blue-600 transition-colors flex items-center">
                    Learn More 
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
