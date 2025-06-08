import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import {
  ParallaxSection,
  ParallaxItem,
} from "@/components/ui/parallax-section";
import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "SharpFlow's LeadGen Agent found 500+ qualified prospects in our target market within the first week. Our sales pipeline has never been stronger.",
    author: "Michael Chen",
    role: "CEO, TechFlow Solutions",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80",
  },
  {
    quote:
      "Sage delivers detailed prospect reports directly to my inbox. We've increased our conversion rate by 250% with better-informed outreach.",
    author: "Sarah Rodriguez",
    role: "Sales Director, Growth Capital",
    image:
      "https://images.unsplash.com/photo-1494790108755-2616b612b977?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80",
  },
  {
    quote:
      "Sentinel handles our initial sales inquiries perfectly. We're responding to leads 24/7 with personalized messages, and our response rate has tripled.",
    author: "David Kim",
    role: "Head of Sales, Innovate Labs",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80",
  },
  {
    quote:
      "SharpFlow's complete lead generation system has transformed our sales process. We went from 50 leads per month to over 800 qualified prospects with minimal effort.",
    author: "Lisa Thompson",
    role: "VP Marketing, Scale Dynamics",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80",
  },
  {
    quote:
      "The three AI agents work seamlessly together. From finding leads to researching prospects to automated follow-ups, our entire sales funnel runs on autopilot.",
    author: "James Wilson",
    role: "VP Sales, DataFlow Corp",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80",
  },
  {
    quote:
      "SharpFlow didn't just deliver software; they gave us a complete sales automation system. Our revenue has increased 400% since implementing their AI agents.",
    author: "Robert Martinez",
    role: "COO, Future Systems",
    image:
      "https://images.unsplash.com/photo-1507101105822-7472b28e22ac?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80",
  },
];

export default function TestimonialsSection() {
  return (
    <ParallaxSection
      id="testimonials"
      className="py-24 bg-background overflow-hidden"
      speed={0.05}
      direction="up"
    >
      <div className="container mx-auto px-6 relative z-10">
        <ParallaxItem direction="up" distance={30}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              What Our Clients Say
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join hundreds of businesses that have transformed their sales with
              SharpFlow's AI lead generation system.
            </p>
          </div>
        </ParallaxItem>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => {
            // Calculate different delays and directions for a staggered effect
            const delay = 0.1 + index * 0.1;
            const directions = ["up", "down", "left", "right"];
            const direction = directions[index % directions.length];

            return (
              <ParallaxItem
                key={index}
                delay={delay}
                direction={direction as "up" | "down" | "left" | "right"}
                distance={20}
              >
                <motion.div
                  whileHover={{
                    scale: 1.03,
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                    transition: { duration: 0.2 },
                  }}
                >
                  <Card className="bg-card border border-border h-full">
                    <CardContent className="p-8">
                      <motion.div
                        className="flex items-center mb-4"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: delay + 0.2, duration: 0.3 }}
                      >
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                      </motion.div>
                      <p className="text-muted-foreground mb-6 italic">
                        "{testimonial.quote}"
                      </p>
                      <div className="flex items-center">
                        <motion.img
                          src={testimonial.image}
                          alt={`${testimonial.author} testimonial`}
                          className="w-12 h-12 rounded-full object-cover mr-4"
                          whileHover={{
                            scale: 1.1,
                            transition: { duration: 0.2 },
                          }}
                        />
                        <div>
                          <div className="font-semibold text-foreground">
                            {testimonial.author}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {testimonial.role}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </ParallaxItem>
            );
          })}
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#38B6FF] rounded-full filter blur-[150px] opacity-10 z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#C1FF72] rounded-full filter blur-[150px] opacity-10 z-0"></div>
    </ParallaxSection>
  );
}
