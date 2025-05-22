import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "Perfect for small businesses getting started with AI",
    price: "$299",
    period: "/month",
    buttonText: "Start Free Trial",
    buttonVariant: "outline" as const,
    features: [
      "1 AI automation workflow",
      "Up to 1,000 processed items/month",
      "Basic analytics dashboard", 
      "Email support",
      "Standard integrations",
      "14-day free trial"
    ],
    popular: false
  },
  {
    name: "Professional",
    description: "Ideal for growing businesses with multiple processes",
    price: "$599",
    period: "/month",
    buttonText: "Start Free Trial",
    buttonVariant: "default" as const,
    features: [
      "5 AI automation workflows",
      "Up to 10,000 processed items/month",
      "Advanced analytics & reporting",
      "Priority support",
      "Custom integrations",
      "Team collaboration tools",
      "API access",
      "30-day free trial"
    ],
    popular: true
  },
  {
    name: "Enterprise",
    description: "For large organizations requiring enterprise-grade solutions",
    price: "Custom",
    period: "",
    buttonText: "Contact Sales",
    buttonVariant: "outline" as const,
    features: [
      "Unlimited AI workflows",
      "Unlimited processed items",
      "Custom analytics & dashboards",
      "24/7 dedicated support",
      "White-label solutions",
      "On-premise deployment",
      "Advanced security & compliance",
      "Custom training & onboarding"
    ],
    popular: false
  }
];

export default function PricingSection() {
  const scrollToContact = () => {
    const element = document.getElementById('contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="pricing" className="py-24 bg-muted">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Choose Your AI Automation Plan</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Flexible pricing that scales with your business. Start free and upgrade as you grow.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative shadow-lg hover:shadow-xl transition-shadow ${
                plan.popular 
                  ? 'bg-[#38B6FF] text-white border-2 border-[#38B6FF]' 
                  : 'bg-card border border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-[#C1FF72] text-black px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  Most Popular
                </div>
              )}
              
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-black'}`}>
                    {plan.name}
                  </h3>
                  <p className={`mb-6 ${plan.popular ? 'text-blue-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-black'}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={plan.popular ? 'text-blue-100' : 'text-gray-600'}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <Button
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-white text-[#38B6FF] hover:bg-gray-100' 
                        : plan.name === 'Enterprise'
                          ? 'bg-black text-white hover:bg-gray-800'
                          : 'bg-gray-100 text-black hover:bg-gray-200'
                    }`}
                    onClick={plan.name === 'Enterprise' ? scrollToContact : undefined}
                  >
                    {plan.buttonText}
                  </Button>
                </div>
                
                <ul className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className={`w-4 h-4 mr-3 ${plan.popular ? 'text-[#C1FF72]' : 'text-[#C1FF72]'}`} />
                      <span className={plan.popular ? 'text-white' : 'text-gray-700'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">All plans include a money-back guarantee and can be cancelled anytime.</p>
          <button className="text-[#38B6FF] font-semibold hover:text-blue-600 flex items-center mx-auto">
            Compare all features 
            <Check className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
