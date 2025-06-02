"use client";
import React from "react";
import { motion } from "motion/react";

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: typeof testimonials;
  duration?: number;
}) => {
  return (
    <div className={`flex-1 ${props.className || ""}`}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-background px-2 sm:px-3"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div
                  className="p-6 sm:p-8 rounded-3xl border border-border bg-card/50 backdrop-blur-sm shadow-lg shadow-primary/10 w-full hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
                  key={i}
                >
                  <div className="text-muted-foreground leading-relaxed italic">
                    "{text}"
                  </div>
                  <div className="flex items-center gap-2 mt-5">
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={name}
                      className="h-10 w-10 rounded-full"
                    />
                    <div className="flex flex-col">
                      <div className="font-semibold tracking-tight leading-5 text-foreground">
                        {name}
                      </div>
                      <div className="leading-5 text-sm text-muted-foreground tracking-tight">
                        {role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};

// SharpFlow-specific testimonials data
const testimonials = [
  {
    text: "SharpFlow's LeadGen Agent found 500+ qualified prospects in our target market within the first week. Our sales pipeline has never been stronger.",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    name: "Michael Chen",
    role: "CEO, TechFlow Solutions",
  },
  {
    text: "The automated lead generation system has transformed our sales process. We went from 50 leads per month to over 800 qualified prospects with minimal effort.",
    image:
      "https://images.unsplash.com/photo-1494790108755-2616b612b977?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    name: "Sarah Rodriguez",
    role: "VP Marketing, Growth Capital",
  },
  {
    text: "SharpFlow's multi-tenant system gives each client their own dedicated bot. The data isolation and security features exceeded our enterprise requirements.",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    name: "David Kim",
    role: "CTO, Innovate Labs",
  },
  {
    text: "SharpFlow's lead generation system tripled our conversion rate. The automated workflows and personalization features have been game-changing for our sales team.",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    name: "Lisa Thompson",
    role: "VP Marketing, Scale Dynamics",
  },
  {
    text: "The Telegram bot integration is brilliant. Our leads receive instant responses 24/7, and the quality of prospects has improved dramatically since using SharpFlow.",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    name: "James Wilson",
    role: "CTO, DataFlow Corp",
  },
  {
    text: "SharpFlow didn't just deliver software; they gave us a complete sales automation system. Our revenue has increased 400% since implementing their AI agents.",
    image:
      "https://images.unsplash.com/photo-1507101105822-7472b28e22ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    name: "Robert Martinez",
    role: "COO, Future Systems",
  },
  {
    text: "SharpFlow's analytics dashboard gives us real-time insights into our lead generation performance. We can track ROI and optimize campaigns instantly.",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    name: "Emily Davis",
    role: "Data Analyst, InnovateTech",
  },
  {
    text: "Implementation was seamless and the support team guided us every step of the way. Our lead generation increased by 200% within the first month.",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    name: "Alex Johnson",
    role: "Operations Director, FutureCorp",
  },
  {
    text: "The lead qualification process has transformed our workflow completely. What used to take hours now takes minutes, and the accuracy is phenomenal.",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    name: "Maria Garcia",
    role: "Process Manager, TechSolutions",
  },
];

export { testimonials };
