import { Github, Linkedin, Twitter } from "lucide-react";

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
        "HR & Recruitment AI",
      ],
    },
    {
      title: "Company",
      links: [
        "About Us",
        "Careers",
        "Blog",
        "Case Studies",
        "Press",
        "Partners",
      ],
    },
    {
      title: "Support",
      links: [
        "Help Center",
        "Documentation",
        "API Reference",
        "Status",
        "Contact",
        "Security",
      ],
    },
  ];

  return (
    <footer className="bg-background border-t border-border text-foreground py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 sm:mb-12">
          <div className="col-span-1 xs:col-span-2 md:col-span-1">
            <img
              src="/footer_logo.svg"
              alt="SharpFlow Logo"
              className="h-16 sm:h-20 md:h-24 w-auto mb-4 sm:mb-6"
            />
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Empowering businesses with cutting-edge AI automation solutions
              for enhanced efficiency and revenue growth.
            </p>
            <div className="flex space-x-3 sm:space-x-4">
              <a
                href="#"
                className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex items-center justify-center hover:bg-[#38B6FF] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-3 h-3 sm:w-4 sm:h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex items-center justify-center hover:bg-[#38B6FF] transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-3 h-3 sm:w-4 sm:h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-full flex items-center justify-center hover:bg-[#38B6FF] transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-3 h-3 sm:w-4 sm:h-4" />
              </a>
            </div>
          </div>

          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 text-foreground">
                {section.title}
              </h4>
              <ul className="space-y-1 sm:space-y-2 text-muted-foreground">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href="#"
                      className="text-xs sm:text-sm hover:text-foreground transition-colors inline-block py-1"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-xs sm:text-sm">
            © 2024 SharpFlow. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center md:justify-end space-x-4 sm:space-x-6 mt-4 md:mt-0">
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground text-xs sm:text-sm transition-colors py-1"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground text-xs sm:text-sm transition-colors py-1"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground text-xs sm:text-sm transition-colors py-1"
            >
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
