import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, BarChart3, CheckCircle, Brain, Target, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas font-body text-ink selection:bg-deep-green selection:text-white flex flex-col">
      {/* ─── Header ─── */}
      <header className="fixed top-0 w-full z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between rounded-full border border-white/45 bg-white/25 px-6 py-3 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/40">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary rounded-2xl flex items-center justify-center shadow-sm">
              <span className="text-on-primary font-display font-bold text-sm">H</span>
            </div>
            <span className="font-display text-xl font-semibold text-primary tracking-tight">
              HireFlow
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-btn font-medium text-body-muted hover:text-ink transition-colors px-2"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-btn font-medium bg-primary text-on-primary px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-pale-green opacity-40 rounded-full blur-[100px] -z-10 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pale-green text-deep-green text-micro font-medium border border-[#b2edb0]">
            <Brain className="w-4 h-4" />
            <span>Introducing Smart Recruitment</span>
          </div>
          
          <h1 className="font-display text-[56px] md:text-product leading-[1.1] tracking-tight text-primary">
            Hire Smarter, <br />
            <span className="text-deep-green italic pr-2">Not Harder.</span>
          </h1>
          
          <p className="text-body-large text-slate max-w-2xl mx-auto leading-relaxed">
            Automate your hiring pipeline with instant ATS resume scoring, highly-adaptive AI voice interviews, and data-driven candidate rankings.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 bg-deep-green text-white px-8 py-4 rounded-full text-btn font-medium hover:opacity-90 transition-all active:scale-95 w-full sm:w-auto"
            >
              Start Hiring Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-white text-ink border border-hairline px-8 py-4 rounded-full text-btn font-medium hover:bg-soft-stone transition-colors w-full sm:w-auto"
            >
              Candidate Login
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="py-24 px-6 bg-white border-y border-hairline">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="font-display text-section-heading text-primary tracking-tight">Everything you need.</h2>
            <p className="text-body-large text-slate">Powerful tools to find the perfect fit, instantly.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Target}
              title="Instant ATS Scoring"
              description="Upload a resume and instantly see how well it matches your job description using intelligent skill gap analysis."
            />
            <FeatureCard 
              icon={Bot}
              title="Adaptive AI Interviews"
              description="Our AI dynamically adjusts questions based on the candidate's previous answers for a truly conversational assessment."
            />
            <FeatureCard 
              icon={BarChart3}
              title="Actionable Analytics"
              description="Make objective decisions using data-driven candidate rankings, deep dive evaluations, and real-time insights."
            />
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-16">
          <h2 className="font-display text-section-heading text-primary tracking-tight">How it Works</h2>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-hairline -z-10" />
            
            <Step 
              number="1"
              title="Upload & Parse"
              description="Candidates upload their resume. HireFlow instantly extracts text and generates an ATS match score."
            />
            <Step 
              number="2"
              title="AI Assessment"
              description="Candidates take a voice-based AI interview tailored specifically to the job description and their resume claims."
            />
            <Step 
              number="3"
              title="Hire the Best"
              description="Recruiters view automatically ranked leaderboards and detailed evaluations to make an offer."
            />
          </div>
        </div>
      </section>

      {/* ─── CTA & Footer ─── */}
      <section className="mt-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto bg-primary text-white rounded-3xl p-12 md:p-20 text-center space-y-8 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-deep-green/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          
          <h2 className="font-display text-section-display tracking-tight leading-[1.1] relative z-10">
            Ready to transform <br/> your hiring?
          </h2>
          <div className="relative z-10">
            <Link
              to="/register"
              className="inline-flex items-center justify-center bg-white text-primary px-8 py-4 rounded-full text-btn font-bold hover:bg-soft-stone transition-colors active:scale-95"
            >
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>

      {/* ─── LangChain Style Footer ─── */}
      <footer className="bg-[#0a0a0c] text-white pt-24 pb-8 overflow-hidden font-body">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20 border-b border-white/10 pb-16">
            
            {/* Products Column */}
            <div className="space-y-6">
              <h4 className="text-[#6bb5ff] font-display text-lg tracking-tight">Products</h4>
              <ul className="space-y-3 text-sm text-[#8c8c9a] font-mono-label">
                <li><Link to="#" className="hover:text-white transition-colors">Smart ATS Platform</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">AI Voice Interviews</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Candidate Ranking</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Predictive Analytics</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Team Collaboration</Link></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="space-y-6">
              <h4 className="text-[#6bb5ff] font-display text-lg tracking-tight">Resources</h4>
              <ul className="space-y-3 text-sm text-[#8c8c9a] font-mono-label">
                <li><Link to="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Customer Stories</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Guides</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Support</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">HireFlow Academy</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="space-y-6">
              <h4 className="text-[#6bb5ff] font-display text-lg tracking-tight">Company</h4>
              <ul className="space-y-3 text-sm text-[#8c8c9a] font-mono-label">
                <li><Link to="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Partners</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Trust Center</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Marketing Assets</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Events</Link></li>
              </ul>
            </div>

            {/* Newsletter Column */}
            <div className="space-y-6">
              <h4 className="text-[#6bb5ff] font-display text-lg tracking-tight pr-4">Sign up for our newsletter to stay up to date</h4>
              <form className="space-y-3">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="w-full bg-[#121214] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#6bb5ff] transition-colors font-mono"
                />
                <button type="button" className="w-auto ml-auto block bg-white text-primary px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  Subscribe
                </button>
              </form>
              <div className="flex items-center justify-end gap-4 pt-2">
                <a href="#" className="text-[#8c8c9a] hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="#" className="text-[#8c8c9a] hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" className="text-[#8c8c9a] hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd"/></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Massive Outline Text Logo */}
          <SpotlightLogo />

          {/* Bottom Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 text-sm text-[#8c8c9a] font-mono-label">
            <div className="flex items-center gap-2 mb-4 sm:mb-0">
              <span className="w-2 h-2 rounded-full bg-[#6bb5ff] animate-pulse"></span>
              All systems operational
            </div>
            <div className="flex items-center gap-6">
              <Link to="#" className="hover:text-white transition-colors">Privacy policy</Link>
              <Link to="#" className="hover:text-white transition-colors">Terms of service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="p-8 rounded-[2rem] border border-hairline bg-canvas hover:border-deep-green/30 hover:shadow-sm transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-soft-stone flex items-center justify-center mb-6 group-hover:bg-pale-green group-hover:text-deep-green transition-colors">
        <Icon className="w-6 h-6 text-slate group-hover:text-deep-green" />
      </div>
      <h3 className="font-display text-feature-heading text-primary mb-3">{title}</h3>
      <p className="text-body text-slate leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }) {
  return (
    <div className="relative flex flex-col items-center text-center space-y-4 bg-canvas">
      <div className="w-16 h-16 rounded-full bg-white border-2 border-primary flex items-center justify-center text-title font-display font-medium text-primary shadow-sm">
        {number}
      </div>
      <h3 className="font-display text-feature-heading text-primary">{title}</h3>
      <p className="text-body text-slate leading-relaxed">{description}</p>
    </div>
  );
}

function SpotlightLogo() {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full overflow-hidden flex items-center justify-center pb-8 select-none group cursor-crosshair"
    >
      {/* Base Outline Text */}
      <span 
        className="font-display tracking-tighter" 
        style={{
          fontSize: 'clamp(5rem, 15vw, 15rem)',
          lineHeight: 0.8,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(255, 255, 255, 0.15)'
        }}
      >
        HireFlow
      </span>

      {/* Spotlight Silhouette Text */}
      <span 
        className="font-display tracking-tighter absolute inset-0 flex items-center justify-center pb-8 pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity duration-300"
        style={{
          fontSize: 'clamp(5rem, 15vw, 15rem)',
          lineHeight: 0.8,
          color: '#059669', // Subtle deep green tint
          WebkitMaskImage: 'radial-gradient(circle 200px at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 100%)',
          maskImage: 'radial-gradient(circle 200px at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 100%)'
        }}
      >
        HireFlow
      </span>
    </div>
  );
}
