import { Github, Linkedin, Twitter } from "lucide-react";
import artivanceLogo from "@assets/1.png";

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
    <footer className="bg-black text-white py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <img 
              src={artivanceLogo} 
              alt="ARTIVANCE Logo" 
              className="h-8 w-auto mb-6 filter brightness-0 invert"
            />
            <p className="text-gray-400 mb-4">
              Empowering businesses with cutting-edge AI automation solutions for enhanced efficiency and revenue growth.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#38B6FF] transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#38B6FF] transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#38B6FF] transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2 text-gray-400">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a href="#" className="hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 ARTIVANCE. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
