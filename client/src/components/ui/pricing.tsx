"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { useState, useRef } from "react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import confetti from "canvas-confetti";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you. All plans include access to our platform, lead generation tools, and dedicated support.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);

    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: [
          "hsl(var(--primary))",
          "hsl(var(--accent))",
          "hsl(var(--secondary))",
          "#38B6FF",
          "#C1FF72",
        ],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div className="container py-20">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h2>
        <p className="text-muted-foreground text-lg whitespace-pre-line">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap justify-center items-center gap-4 mb-10 px-4 max-w-md mx-auto">
        <div className="flex items-center justify-between w-full bg-muted/10 p-3 rounded-xl">
          <span
            className={`font-semibold text-sm sm:text-base px-3 py-1 rounded-xl transition-colors ${
              isMonthly ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            Monthly
          </span>
          <div className="relative inline-flex items-center mx-2 py-1">
            <Switch
              ref={switchRef as any}
              checked={!isMonthly}
              onCheckedChange={handleToggle}
              className="relative pricing-toggle"
            />
          </div>
          <span
            className={`font-semibold text-sm sm:text-base px-3 py-1 rounded-xl transition-colors ${
              !isMonthly
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground"
            }`}
          >
            Annual{" "}
            <span className="text-primary/80 hidden sm:inline">(Save 20%)</span>
            <span className="text-primary/80 sm:hidden">(20% off)</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 sm:2 gap-4">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -20 : 0,
                    opacity: 1,
                    x: index === 2 ? -30 : index === 0 ? 30 : 0,
                    scale: index === 0 || index === 2 ? 0.94 : 1.0,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: 0.4,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              `rounded-2xl p-2 bg-background text-center lg:flex lg:flex-col lg:justify-center relative`,
              plan.isPopular ? "z-10" : "z-0",
              "flex flex-col",
              !plan.isPopular && "mt-5",
              index === 0 || index === 2
                ? "z-0 transform translate-x-0 translate-y-0 -translate-z-[50px] rotate-y-[10deg]"
                : "z-10",
              index === 0 && "origin-right",
              index === 2 && "origin-left"
            )}
          >
            <div className="relative h-full rounded-xl border-[0.75px] border-border">
              {/* Glowing Effect */}
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={3}
                variant={plan.isPopular ? "default" : "white"}
              />

              <div className="relative h-full flex flex-col z-10 p-6">
                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                    <Star className="text-primary-foreground h-4 w-4 fill-current" />
                    <span className="text-primary-foreground ml-1 font-sans font-semibold">
                      Popular
                    </span>
                  </div>
                )}

                <div className="flex-1 flex flex-col">
                  <p className="text-base font-semibold text-muted-foreground">
                    {plan.name}
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-x-2">
                    <span className="text-5xl font-bold tracking-tight text-foreground">
                      ${isMonthly ? plan.price : plan.yearlyPrice}
                    </span>
                    {plan.period !== "Next 3 months" && (
                      <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                        / {plan.period}
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-5 text-muted-foreground">
                    {isMonthly ? "billed monthly" : "billed annually"}
                  </p>

                  <ul className="mt-5 gap-2 flex flex-col">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span className="text-left">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <hr className="w-full my-4" />

                  <a
                    href={plan.href}
                    className={cn(
                      buttonVariants({
                        variant: plan.isPopular ? "default" : "outline",
                      }),
                      "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                      "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    {plan.buttonText}
                  </a>
                  <p className="mt-6 text-xs leading-5 text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
