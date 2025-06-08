import { Button } from "@/components/ui/button";
import { Play, Check } from "lucide-react";
import {
  ParallaxSection,
  ParallaxItem,
} from "@/components/ui/parallax-section";
import { motion } from "framer-motion";

export default function HeroSection() {
  const scrollToContact = () => {
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <ParallaxSection
      className="pt-24 sm:pt-28 md:pt-32 pb-16 sm:pb-20 md:pb-24 overflow-hidden"
      backgroundClassName="bg-gradient-to-br from-muted to-background opacity-80"
      speed={0.15}
      direction="down"
    >
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="max-w-xl">
            <ParallaxItem delay={0.1} direction="left" distance={30}>
              <h1 className="text-fluid-4xl sm:text-fluid-5xl font-bold text-foreground leading-tight mb-4 sm:mb-6">
                Supercharge Your Sales with{" "}
                <span className="text-[#38B6FF]">AI Lead Generation</span>
              </h1>
            </ParallaxItem>

            <ParallaxItem delay={0.3} direction="left" distance={30}>
              <p className="text-fluid-lg sm:text-fluid-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
                Find, research, and engage qualified leads automatically with
                Falcon, Sage, and Sentinel - your specialized AI agent team.
                Scale your sales pipeline with SharpFlow's intelligent
                automation.
              </p>
            </ParallaxItem>

            <ParallaxItem delay={0.5} direction="up" distance={30}>
              <div className="flex flex-col xs:flex-row gap-3 sm:gap-4">
                <Button
                  size="lg"
                  className="bg-[#38B6FF] text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 hover:bg-blue-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-sm sm:text-base"
                  onClick={scrollToContact}
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-[#38B6FF] text-[#38B6FF] px-4 sm:px-6 md:px-8 py-3 sm:py-4 hover:bg-[#38B6FF] hover:text-white transition-colors text-sm sm:text-base"
                >
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Watch Demo
                </Button>
              </div>
            </ParallaxItem>

            <ParallaxItem delay={0.7} direction="up" distance={20}>
              <div className="mt-6 sm:mt-8 flex flex-col xs:flex-row xs:items-center xs:space-x-4 sm:space-x-6 space-y-2 xs:space-y-0 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-[#C1FF72] flex-shrink-0" />
                  <span>95% Lead Accuracy</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-[#C1FF72] flex-shrink-0" />
                  <span>300% Response Rate Increase</span>
                </div>
              </div>
            </ParallaxItem>
          </div>

          <ParallaxItem delay={0.3} direction="right" distance={50}>
            <div className="relative mt-8 lg:mt-0">
              <motion.img
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600"
                alt="AI automation workspace"
                className="rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl w-full"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              />

              <motion.div
                className="absolute -bottom-4 sm:-bottom-6 -left-4 sm:-left-6 bg-white p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl shadow-lg border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#C1FF72] rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-black rounded-sm"></div>
                  </div>
                  <div>
                    <div className="font-semibold text-black text-sm sm:text-base">
                      AI Processing
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">
                      99.9% Uptime
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </ParallaxItem>
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 bg-[#38B6FF] rounded-full filter blur-[100px] sm:blur-[150px] opacity-20 z-0"></div>
      <div className="absolute bottom-20 right-10 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 bg-[#C1FF72] rounded-full filter blur-[100px] sm:blur-[150px] opacity-20 z-0"></div>
    </ParallaxSection>
  );
}
