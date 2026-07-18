const research = [
  ["01", "Nanopore sensing", "Engineering nanopore platforms that translate molecular-scale events into useful electrical signals."],
  ["02", "QuantumSense", "Developing next-generation sensing approaches within KTH's QuantumSense project."],
  ["03", "MEMS & actuators", "From piezoelectric ultrasonic transducers to robust microsystems for real-world deployment."],
];

const timeline = [
  ["NOW", "PhD Candidate", "Micro & Nano Systems · KTH Royal Institute of Technology"],
  ["2020 — 2022", "MEMS R&D Engineer", "Huawei 2012 Laboratories · MEMS sensors & actuators"],
  ["2019", "MSc, Electrical Engineering", "Zhejiang University · Piezoelectric ultrasonic transducers"],
];

export default function Home() {
  return (
    <main>
      <div className="noise" />
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="Xinxin Liu home">XL<span>·</span></a>
        <div className="navlinks"><a href="#research">Research</a><a href="#path">Path</a><a href="#connect">Connect</a></div>
        <a className="nav-cta" href="mailto:xinxinl@kth.se">Start a conversation <b>↗</b></a>
      </nav>

      <section id="top" className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow"><i /> MICRO / NANO SYSTEMS · STOCKHOLM</p>
          <h1>Making the<br/><em>invisible</em><br/>measurable.</h1>
          <p className="lead">I am <strong>Xinxin Liu</strong>, a doctoral researcher working at the edge of nanopores, MEMS, and quantum sensing.</p>
          <div className="hero-actions"><a className="button primary" href="#research">Explore my research <span>↓</span></a><a className="text-link" href="https://www.kth.se/profile/xinxinl" target="_blank" rel="noreferrer">KTH profile <span>↗</span></a></div>
        </div>
        <div className="hero-art" aria-label="Abstract nanopore signal visual">
          <div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit orbit-c"/>
          <div className="pore"><div className="pore-inner"/><span className="particle p1"/><span className="particle p2"/><span className="particle p3"/><span className="particle p4"/></div>
          <div className="signal"><span/><span/><span/><span/><span/><span/><span/><span/></div>
          <p className="art-label">SIGNAL / NOISE<br/><b>01.048 µA</b></p>
        </div>
        <div className="hero-foot"><span>SCROLL TO EXPLORE</span><div/><span>01 / 03</span></div>
      </section>

      <section id="research" className="research shell">
        <div className="section-head"><p className="eyebrow"><i /> FOCUS AREAS</p><p className="index">01 — 03</p></div>
        <h2>Research with<br/>resolution.</h2>
        <div className="research-grid">{research.map(([number, title, text]) => <article className="research-card" key={number}><span className="card-number">{number}</span><div className="card-mark">✦</div><h3>{title}</h3><p>{text}</p><a href="mailto:xinxinl@kth.se">Discuss this work <span>↗</span></a></article>)}</div>
      </section>

      <section id="path" className="path"><div className="shell"><div className="section-head"><p className="eyebrow"><i /> TRAJECTORY</p><p className="index">2019 — NOW</p></div><div className="path-grid"><h2>Built from<br/><em>the ground up.</em></h2><div className="timeline">{timeline.map(([year, title, text]) => <div className="timeline-item" key={year}><span>{year}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div></div></section>

      <section id="connect" className="connect shell"><p className="eyebrow"><i /> COLLABORATE</p><h2>Have a hard problem<br/>at a <em>small scale?</em></h2><a className="contact-email" href="mailto:xinxinl@kth.se">xinxinl@kth.se <span>↗</span></a><div className="connect-links"><a href="https://scholar.google.com/citations?hl=en&user=wsipcvAAAAAJ" target="_blank" rel="noreferrer">Google Scholar ↗</a><a href="https://orcid.org/0000-0001-9803-6076" target="_blank" rel="noreferrer">ORCID ↗</a><a href="https://www.kth.se/profile/xinxinl" target="_blank" rel="noreferrer">KTH ↗</a></div></section>
      <footer className="shell"><span>© {new Date().getFullYear()} XINXIN LIU</span><span>DESIGNED FOR DISCOVERY</span></footer>
    </main>
  );
}
