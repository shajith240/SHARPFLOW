import { Github, Linkedin, Twitter } from "lucide-react";
import artivanceLogo from "@assets/Artivance.png";

export default function Footer() {
  const footerSections = [
    {
      title: "Services",
      links: [
        "Customer Service AI",
        "Data Analytics AI", 
        "Process Automation",
        "Marketing AI",
        "Financial AI",
        "HR & Recruitment AI"
      ]
    },
    {
      title: "Company",
      links: [
        "About Us",
        "Careers",
        "Blog", 
        "Case Studies",
        "Press",
        "Partners"
      ]
    },
    {
      title: "Support",
      links: [
        "Help Center",
        "Documentation",
        "API Reference",
        "Status",
        "Contact",
        "Security"
      ]
    }
  ];

  return (
    <footer className="bg-background border-t border-border text-foreground py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <img 
              src={artivanceLogo} 
              alt="ARTIVANCE Logo" 
              className="h-8 w-auto mb-6"
            />
            <p className="text-muted-foreground mb-4">
              Empowering businesses with cutting-edge AI automation solutions for enhanced efficiency and revenue growth.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-[#38B6FF] transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-[#38B6FF] transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-[#38B6FF] transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4 text-foreground">{section.title}</h4>
              <ul className="space-y-2 text-muted-foreground">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a href="#" className="hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2024 ARTIVANCE. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
