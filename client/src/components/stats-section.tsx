export default function StatsSection() {
  const stats = [
    {
      value: "500+",
      label: "Businesses Automated",
    },
    {
      value: "90%",
      label: "Cost Reduction",
    },
    {
      value: "24/7",
      label: "AI Support",
    },
    {
      value: "3x",
      label: "Revenue Growth",
    },
  ];

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-black">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
          {stats.map((stat, index) => (
            <div key={index} className="p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#C1FF72] mb-1 sm:mb-2">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm md:text-base text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
