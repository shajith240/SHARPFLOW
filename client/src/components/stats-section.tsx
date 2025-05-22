export default function StatsSection() {
  const stats = [
    {
      value: "500+",
      label: "Businesses Automated"
    },
    {
      value: "90%",
      label: "Cost Reduction"
    },
    {
      value: "24/7",
      label: "AI Support"
    },
    {
      value: "3x",
      label: "Revenue Growth"
    }
  ];

  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <div key={index}>
              <div className="text-4xl font-bold text-[#C1FF72] mb-2">{stat.value}</div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
