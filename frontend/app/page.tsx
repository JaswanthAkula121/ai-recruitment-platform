import PipelineDashboard from "./components/pipeline-dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0e0e0e] text-white">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-3 bg-black/60 backdrop-blur-xl rounded-full mt-6 mx-auto max-w-5xl border border-white/10">
        <div className="text-2xl font-black tracking-tighter bg-gradient-to-br from-indigo-300 to-violet-400 bg-clip-text text-transparent">
          LUXURA
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a className="text-sm text-indigo-300 border-b border-indigo-400 pb-1">
            Platform
          </a>
          <a className="text-sm text-gray-400 hover:text-white">Solutions</a>
          <a className="text-sm text-gray-400 hover:text-white">Resources</a>
          <a className="text-sm text-gray-400 hover:text-white">Pricing</a>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-sm text-gray-400 hover:text-white">
            Log In
          </button>
          <button className="bg-gradient-to-br from-indigo-400 to-purple-500 px-5 py-2 rounded-full text-black font-bold text-sm">
            Start Pro Trial
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-40 max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 space-y-8">
          <h1 className="text-6xl md:text-8xl font-extrabold leading-tight">
            Launch. Manage.{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Scale
            </span>{" "}
            your platform.
          </h1>

          <p className="text-gray-400 text-xl max-w-lg">
            Build and manage your system with powerful tools and real-time
            insights.
          </p>

          <div className="flex gap-6">
            <button className="bg-gradient-to-r from-indigo-400 to-purple-500 px-8 py-4 rounded-full font-bold text-lg">
              Get Started
            </button>
            <button className="text-white font-semibold">
              ▶ Watch Demo
            </button>
          </div>
        </div>

        <div className="flex-1">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWfCAyIvY2OdOdrHajrza7GHqHx9CChw6Dz7tOnsKoHq4Kz5z_h_WMpnVktFkPQ0zcoLgLZr31she3_PJYI9EKnDhE26wfak2SBfGejHwCdB2emOvq7zSItU4amb5W1uzBaw6gtZSjvcqqk5ITChdzXNmkCSCiN9n3USYE2QsjNqVmw1pgb-DMuEXCtjRZfykc_fa7Ga78rhQoPVNIU6ejOetApRZhTSXW2PXn91ajTPIlBfL9DigEItM-Pbz73c5IRmdIBverXgw"
            alt=""
            className="rounded-3xl opacity-80"
          />
        </div>
      </section>

      <PipelineDashboard />

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-8 py-32">
        <h2 className="text-4xl font-bold text-center mb-16">
          Features
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            "Real-time Analytics",
            "Secure Infrastructure",
            "Instant Scalability",
          ].map((title) => (
            <div
              key={title}
              className="bg-white/5 p-8 rounded-2xl backdrop-blur"
            >
              <h3 className="text-xl font-bold mb-2">{title}</h3>
              <p className="text-gray-400 text-sm">
                Powerful tools to scale your platform.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-20">
        <h2 className="text-4xl font-bold mb-6">
          Ready to scale?
        </h2>
        <button className="bg-white text-black px-10 py-4 rounded-full font-bold">
          Launch Now
        </button>
      </section>
    </main>
  );
}
