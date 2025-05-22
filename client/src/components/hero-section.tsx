import { Button } from "@/components/ui/button";
import { Play, Check } from "lucide-react";

export default function HeroSection() {
  const scrollToContact = () => {
    const element = document.getElementById('contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="pt-24 pb-24 bg-gradient-to-br from-muted to-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Automate Your Business with{" "}
              <span className="text-[#38B6FF]">AI Solutions</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Transform your operations, boost revenue, and increase efficiency with cutting-edge AI automation. Join hundreds of businesses already scaling with ARTIVANCE.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                className="bg-[#38B6FF] text-white px-8 py-4 hover:bg-blue-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                onClick={scrollToContact}
              >
                Get Started Free
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-[#38B6FF] text-[#38B6FF] px-8 py-4 hover:bg-[#38B6FF] hover:text-white transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </Button>
            </div>
            <div className="mt-8 flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#C1FF72]" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#C1FF72]" />
                <span>14-Day Free Trial</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
              alt="AI automation workspace" 
              className="rounded-2xl shadow-2xl w-full"
            />
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl shadow-lg border">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#C1FF72] rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 bg-black rounded-sm"></div>
                </div>
                <div>
                  <div className="font-semibold text-black">AI Processing</div>
                  <div className="text-sm text-gray-500">99.9% Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
