const publications = [
  { year: "2026", title: "Lithographic patterning of conformal thin films on 3D structures using Scaffold-architected Lift-off masks", authors: "Xinxin Liu, Zifan Che, Zofia Maj, Lee-Lun Lai, Kristinn B. Gylfason, Valentin Dubois, Shyamprasad N. Raja, Göran Stemme & Frank Niklaus", venue: "Nature Communications 17, 6201", link: "https://www.nature.com/articles/s41467-026-75538-z" },
  { year: "2019", title: "Dynamics of piezoelectric micro-machined ultrasonic transducers for contact and noncontact resonant sensors", authors: "Xinxin Liu, Dengfei Yang, Xuying Chen, Xianhao Le, Lei Yang, Changju Wu & Jin Xie", venue: "Journal of Applied Physics 126, 124502", link: "https://doi.org/10.1063/1.5100201" },
  { year: "2019", title: "A computational piezoelectric micro-machined ultrasonic transducer towards acoustic communication", authors: "Xinxin Liu, Dongya Chen, Dengfei Yang, Xuying Chen, Xianhao Le & Jin Xie", venue: "IEEE Electron Device Letters 40, 965-968", link: "https://doi.org/10.1109/LED.2019.2910174" },
  { year: "2018", title: "A dual-driving piezoelectric DETF resonator with high quality factor and low multimode effect", authors: "Xinxin Liu, Yixiang Wang, Xianhao Le, Zhonggui Xu, Changju Wu & Jin Xie", venue: "Journal of Micromechanics and Microengineering 28, 105006", link: "https://doi.org/10.1088/1361-6439/aadcc2" },
  { year: "2018", title: "Reducing ring-down time of PMUT with phase shift of driving waveform", authors: "Xinxin Liu, Xuying Chen, Xianhao Le, Yong Wang, Changju Wu & Jin Xie", venue: "Sensors and Actuators A: Physical 281, 100-107", link: "https://doi.org/10.1016/j.sna.2018.08.039" },
];

const timeline = [
  ["2021-present", "KTH Royal Institute of Technology", "PhD candidate in Micro and Nanosystems. Research focus: nanofabrication for nanopore devices and 3D microstructures."],
  ["2020-2021", "Huawei HiSilicon", "Engineer. Performed robustness and failure analysis of electrostatic micromirrors for optical attenuation."],
  ["2019-2020", "Huawei Sensor Lab", "Engineer. Developed piezoelectric haptic actuators for PC ClickPad and phone-key modules."],
  ["2017-2019", "Zhejiang University", "MSc student, Electro-Mechanical Engineering. Research in piezoelectric MEMS, pMUT ultrasonic ranging and resonant sensors."],
];

export default function Home() {
  return <main className="formal-site">
    <header className="formal-nav"><a href="#home" className="formal-name">Xinxin</a><nav><a href="#home">Home</a><a href="#publications">Publication</a><a href="#about">About me</a></nav></header>
    <section id="home" className="formal-home"><img src="/Xinxin/xinxin-portrait.jpg" alt="Xinxin Liu" className="formal-portrait" />
      <div className="formal-identity"><h1>Xinxin Liu</h1><div className="formal-contact"><a href="mailto:xinxinl@kth.se">xinxinl@kth.se</a><a href="https://orcid.org/0000-0001-9803-6076" target="_blank" rel="noreferrer">ORCID 0000-0001-9803-6076</a></div><p>PhD candidate in Micro and Nanosystems<br/>KTH Royal Institute of Technology, Stockholm</p></div>
      <p className="formal-home-summary">I develop fabrication approaches for micro- and nanosystems, with current work spanning solid-state nanopore/nanoslit and 3D lithography.</p>
    </section>
    <section className="formal-projects"><h2>MEMS &amp; Nanofabrication</h2>
      <article className="formal-project"><div><h3>3D patterning</h3><p>Scaffold-Architected Lift-Off (SALO) enables conformal thin-film patterning on complex three-dimensional structures.</p><a href="https://www.nature.com/articles/s41467-026-75538-z" target="_blank" rel="noreferrer">Nature Communications paper</a></div><div className="formal-video"><iframe src="https://www.youtube-nocookie.com/embed/bwPk-3icRJ0?rel=0" title="3D lift-off demonstration" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></article>
      <article className="formal-project"><div><h3>Solid-state nanopore</h3><p>Nanopore devices and nanogap sensing concepts for single-molecule measurement and biomedical applications.</p><a href="https://www.kth.se/mst/research/nems-and-nanosystems/project/nanogap-tunnelling-sensors-1.864206" target="_blank" rel="noreferrer">KTH project</a></div><img src="/Xinxin/cleanroom-xinxin.jpeg" alt="Xinxin Liu in a cleanroom" /></article>
      <article className="formal-project"><div><h3>NORDPORE</h3><p>Solid-state nanopore chips and microfluidic flowcells with tunable geometry for molecular analysis.</p><a href="https://www.nordpore.com/" target="_blank" rel="noreferrer">NORDPORE</a></div><img src="/Xinxin/nordpore-poster.jpg" alt="NORDPORE" /></article>
      <article className="formal-project"><div><h3>pMUT ultrasonic sensing</h3><p>Piezoelectric micromachined ultrasonic transducers for ranging, resonant sensing and acoustic communication.</p><a href="https://doi.org/10.1063/1.5100201" target="_blank" rel="noreferrer">Journal of Applied Physics</a></div><img src="/Xinxin/pmut-rangefinder.png" alt="Pulse and echo principle of ultrasonic ranging" /></article>
    </section>
    <section id="publications" className="formal-publications"><h2>Publications</h2>{["2026", "2019", "2018"].map(year => <div className="pub-year" key={year}><p>{year}</p><div>{publications.filter(item => item.year === year).map(item => <article key={item.title}><a href={item.link} target="_blank" rel="noreferrer">{item.title}</a><p>{item.authors}<br/>{item.venue}</p></article>)}</div></div>)}</section>
    <section id="about" className="formal-about"><h2>About me</h2><p className="formal-intro">My background bridges mechanical engineering, piezoelectric MEMS, industrial device development and nanofabrication research.</p><div className="formal-timeline">{timeline.map(([time, organisation, description]) => <article key={time}><div className="timeline-org"><p>{time}</p><strong>{organisation}</strong></div><div className="timeline-point"/><div className="timeline-role"><p>{description}</p></div></article>)}</div></section>
    <footer>© {new Date().getFullYear()} Xinxin Liu</footer>
  </main>;
}
