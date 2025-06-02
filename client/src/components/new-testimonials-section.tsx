import {
  TestimonialsColumn,
  testimonials,
} from "@/components/ui/testimonials-columns-1";
import { motion } from "motion/react";

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const NewTestimonialsSection = () => {
  return (
    <section id="testimonials" className="bg-background my-20 relative">
      {/* Header section with container for centered content */}
      <div className="container z-10 mx-auto mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <div className="flex justify-center">
            <div className="border py-1 px-4 rounded-lg bg-muted/20 text-muted-foreground">
              Testimonials
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tighter mt-5 text-center">
            What our clients say
          </h2>
          <p className="text-center mt-5 opacity-75 text-muted-foreground">
            See what our customers have to say about SharpFlow AI lead
            generation.
          </p>
        </motion.div>
      </div>

      {/* Full-width testimonials section - Cursor.com style */}
      <div className="w-full z-10 relative overflow-hidden">
        <div className="flex w-full [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </div>
      </div>

      {/* Background decorative elements matching SharpFlow theme */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#38B6FF] rounded-full filter blur-[150px] opacity-10 z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#C1FF72] rounded-full filter blur-[150px] opacity-10 z-0"></div>
    </section>
  );
};

export default NewTestimonialsSection;
