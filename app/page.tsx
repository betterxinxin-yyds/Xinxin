const research = [
  ["01", "Nanopore sensing", "Engineering nanopore platforms that translate molecular-scale events into useful electrical signals."],
  ["02", "QuantumSense", "Developing next-generation sensing approaches within KTH's QuantumSense project."],
  ["03", "MEMS & actuators", "From piezoelectric ultrasonic transducers to robust microsystems for real-world deployment."],
];

const timeline = [
  ["2021 — Present", "PhD Candidate · KTH", "Nanopore devices for single-molecule sensing, 3D micro/nanofabrication and conformal thin-film patterning."],
  ["2020 — 2021", "MEMS Engineer · Huawei HiSilicon", "Electrostatic micromirror testing, robustness and failure analysis for optical attenuation systems."],
  ["2019 — 2020", "Sensor Lab Engineer · Huawei", "Piezoelectric haptic ClickPad and phone-key actuator development, from design through product launch."],
  ["2017 — 2019", "MSc · Zhejiang University", "pMUT ultrasonic ranging, acoustic logic and resonant-sensor research in electro-mechanical engineering."],
  ["2016 — 2017", "MEMS Resonator Research", "Double-ended tuning-fork accelerometer research: high-Q resonator design and multimode suppression."],
  ["2011 — 2015", "BSc · Xi'an Jiaotong University", "Mechanics."],
];

export default function Home() {
  return (
    <main>
      <div className="noise" />
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="Xinxin Liu home">XL<span>·</span></a>
        <div className="navlinks"><a href="#research">Research</a><a href="#work">Selected work</a><a href="#path">Path</a><a href="#connect">Connect</a></div>
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
        <h2>Techniques &amp;<br/><em>research directions.</em></h2>
        <div className="research-grid">{research.map(([number, title, text]) => <article className="research-card" key={number}><span className="card-number">{number}</span><div className="card-mark">✦</div><h3>{title}</h3><p>{text}</p><a href="mailto:xinxinl@kth.se">Discuss this work <span>↗</span></a></article>)}</div>
      </section>

      <section id="work" className="featured shell">
        <div className="section-head"><p className="eyebrow"><i /> SELECTED WORK</p><p className="index">RESEARCH / TRANSLATION</p></div>
        <div className="featured-grid">
          <article className="feature-paper"><p className="feature-kicker">NATURE COMMUNICATIONS · 2026</p><h2>Lithographic patterning of conformal thin films on 3D structures.</h2><p>Co-author of a Scaffold-Architected Lift-Off (SALO) approach for high-resolution patterning of conformal thin films on complex three-dimensional micro- and nanostructures, including ALD coatings.</p><a className="button primary" href="https://www.nature.com/articles/s41467-026-75538-z" target="_blank" rel="noreferrer">Read the paper <span>↗</span></a></article>
          <aside className="feature-side"><div><span>01</span><h3>Nanopore sensing</h3><p>Solid-state nanopores, ionic-current readout and molecular sensing platforms within the QuantumSense research context.</p></div><div><span>02</span><h3>NORDPORE</h3><p>Solid-state nanopore chips and microfluidic flowcells for precision, geometry-tunable molecular analysis.</p><a href="https://www.nordpore.com/" target="_blank" rel="noreferrer">Explore NORDPORE ↗</a></div></aside>
        </div>
      </section>

      <section className="fieldwork shell">
        <div className="section-head"><p className="eyebrow"><i /> FROM CONCEPT TO DEVICE</p><p className="index">WATCH / SEE / BUILD</p></div>
        <div className="fieldwork-grid">
          <figure className="sem-figure"><img src="/Xinxin/salo-sem.jpg" alt="Scanning electron microscope image of a patterned three-dimensional microstructure"/><figcaption>SALO on a stepped 3D structure · SEM image</figcaption></figure>
          <div className="video-card"><div className="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/bwPk-3icRJ0?rel=0" title="3D lift-off demonstration" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div><p>3D lift-off in motion</p><span>A process demonstration of patterning on complex microstructures.</span></div>
        </div>
        <div className="people-strip"><img src="/Xinxin/cleanroom-xinxin.jpeg" alt="Xinxin Liu in a cleanroom holding a microfabricated wafer"/><div><p className="eyebrow"><i /> MAKING AT THE NANO-SCALE</p><h3>From cleanroom process to functional system.</h3><p>Device fabrication, thin-film processing and nanopore technology connect research questions with manufacturable microsystems.</p></div><img className="nordpore-poster" src="/Xinxin/nordpore-poster.jpg" alt="NORDPORE solid-state nanopore manufacturing"/></div>
      </section>

      <section id="path" className="path"><div className="shell"><div className="section-head"><p className="eyebrow"><i /> EXPERIENCE &amp; EDUCATION</p><p className="index">2011 — NOW</p></div><div className="path-grid"><h2>A path through<br/><em>micro &amp; nanosystems.</em></h2><div className="timeline">{timeline.map(([year, title, text]) => <div className="timeline-item" key={year}><span>{year}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div></div></section>

      <section id="connect" className="connect shell"><p className="eyebrow"><i /> COLLABORATE</p><h2>Have a hard problem<br/>at a <em>small scale?</em></h2><a className="contact-email" href="mailto:xinxinl@kth.se">xinxinl@kth.se <span>↗</span></a><div className="connect-links"><a href="https://scholar.google.com/citations?hl=en&user=wsipcvAAAAAJ" target="_blank" rel="noreferrer">Google Scholar ↗</a><a href="https://orcid.org/0000-0001-9803-6076" target="_blank" rel="noreferrer">ORCID ↗</a><a href="https://www.kth.se/profile/xinxinl" target="_blank" rel="noreferrer">KTH ↗</a></div></section>
      <footer className="shell"><span>© {new Date().getFullYear()} XINXIN LIU</span><span>DESIGNED FOR DISCOVERY</span></footer>
    </main>
  );
}
