import { Card, CardContent } from "@/components/ui/card";
import { Search, Linkedin, Mail, ArrowRight, Check } from "lucide-react";
import {
  ParallaxSection,
  ParallaxItem,
} from "@/components/ui/parallax-section";
import { motion } from "framer-motion";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const services = [
  {
    icon: Search,
    title: "Falcon",
    agentType: "Lead Generation Agent",
    logo: "/falcon.png",
    description:
      "Meet Falcon, your precision lead hunter. This intelligent AI agent soars through vast databases to find qualified prospects based on your specific location, occupation, and industry criteria with 95% accuracy.",
    features: [
      "Location-based targeting",
      "Industry-specific filtering",
      "Occupation matching",
      "Real-time lead scoring",
      "Advanced prospect qualification",
    ],
  },
  {
    icon: Linkedin,
    title: "Sage",
    agentType: "Lead Research Agent",
    logo: "/sage.png",
    description:
      "Meet Sage, your research mastermind. This wise AI agent conducts advanced LinkedIn profile analysis and compiles comprehensive research reports delivered directly to your email inbox.",
    features: [
      "Profile data extraction",
      "Automated research reports",
      "Email delivery system",
      "Contact information discovery",
      "Competitive intelligence",
    ],
  },
  {
    icon: Mail,
    title: "Sentinel",
    agentType: "Auto-Reply Agent",
    logo: "/sentinel.png",
    description:
      "Meet Sentinel, your communication guardian. This sophisticated AI agent stands watch over your inbox, responding to sales inquiries with personalized messages, increasing response rates by 300%.",
    features: [
      "Personalized responses",
      "Smart email templates",
      "Follow-up sequences",
      "Performance analytics",
      "24/7 inbox monitoring",
    ],
  },
];

export default function ServicesSection() {
  return (
    <ParallaxSection
      id="services"
      className="py-16 sm:py-20 md:py-24 bg-background overflow-hidden"
      speed={0.1}
      direction="up"
    >
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <ParallaxItem direction="up" distance={30}>
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-fluid-3xl sm:text-fluid-4xl font-bold text-foreground mb-3 sm:mb-4">
              Meet Your AI Agent Team
            </h2>
            <p className="text-fluid-lg sm:text-fluid-xl text-muted-foreground max-w-3xl mx-auto">
              Falcon, Sage, and Sentinel - three specialized AI agents that work
              together to find, research, and engage qualified leads
              automatically.
            </p>
          </div>
        </ParallaxItem>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <ParallaxItem
                key={index}
                delay={0.1 * index}
                direction={index % 2 === 0 ? "up" : "down"}
                distance={20}
              >
                <div className="h-full">
                  <div className="relative h-full rounded-lg sm:rounded-xl border-[0.75px] border-border p-2">
                    {/* Glowing Effect */}
                    <GlowingEffect
                      spread={40}
                      glow={true}
                      disabled={false}
                      proximity={64}
                      inactiveZone={0.01}
                      borderWidth={3}
                      variant="default"
                    />

                    <div className="relative h-full flex flex-col z-10">
                      <Card className="bg-card border-none shadow-none h-full flex flex-col">
                        <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                          {/* Agent Logo Container */}
                          <div className="mb-4 sm:mb-5 md:mb-6 flex-shrink-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl overflow-hidden">
                              <img
                                src={service.logo}
                                alt={`${service.title} Agent Logo`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>

                          {/* Agent Name and Type */}
                          <div className="mb-3 sm:mb-4 flex-shrink-0">
                            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                              {service.title}
                            </h3>
                            <p className="text-sm sm:text-base text-[#38B6FF] font-medium">
                              {service.agentType}
                            </p>
                          </div>

                          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-5 md:mb-6 leading-relaxed">
                            {service.description}
                          </p>
                          <ul className="space-y-1 sm:space-y-2 mb-4 sm:mb-5 md:mb-6 flex-grow">
                            {service.features.map((feature, featureIndex) => (
                              <li
                                key={featureIndex}
                                className="flex items-center text-xs sm:text-sm text-muted-foreground"
                              >
                                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-[#C1FF72] mr-1 sm:mr-2 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          <button className="text-[#38B6FF] text-sm sm:text-base font-semibold hover:text-blue-600 transition-colors flex items-center mt-auto flex-shrink-0 min-h-[44px]">
                            Learn More
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </ParallaxItem>
            );
          })}
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute top-40 right-0 w-36 sm:w-48 md:w-72 h-36 sm:h-48 md:h-72 bg-[#38B6FF] rounded-full filter blur-[100px] sm:blur-[180px] opacity-10 z-0"></div>
      <div className="absolute bottom-40 left-0 w-36 sm:w-48 md:w-72 h-36 sm:h-48 md:h-72 bg-[#C1FF72] rounded-full filter blur-[100px] sm:blur-[180px] opacity-10 z-0"></div>
    </ParallaxSection>
  );
}
