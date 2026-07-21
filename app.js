/* ============================================================
   Tushar Bhatt Portfolio v3 — Motion & Interaction
   GSAP + Three.js. Respect prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";
  document.body.classList.add("js");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* Registry of 3D materials that recolor on theme change */
  const canvasMats = { particle: null, wire: null, dots: [], ring: null };
  function recolor3D() {
    const pal = threePalette();
    if (canvasMats.particle) {
      canvasMats.particle.color.setHex(pal.particle);
      canvasMats.particle.blending = pal.particleBlend;
      canvasMats.particle.opacity = pal.particleOpacity;
      canvasMats.particle.needsUpdate = true;
    }
    if (canvasMats.wire) {
      canvasMats.wire.color.setHex(pal.wire);
      canvasMats.wire.opacity = pal.wireOpacity;
    }
    canvasMats.dots.forEach((m, i) => m && m.color.setHex(i % 2 ? pal.sky : pal.wire));
    if (canvasMats.ring) {
      canvasMats.ring.color.setHex(pal.wire);
      canvasMats.ring.opacity = pal.ringOpacity;
    }
  }

  /* ---------- Preloader ---------- */
  function runLoader(done) {
    const fill = document.getElementById("loader-fill");
    const pct = document.getElementById("loader-pct");
    const status = document.getElementById("loader-status");
    const msgs = [
      "Initializing interface",
      "Loading particle field",
      "Mounting components",
      "Calibrating motion",
      "Ready",
    ];
    if (reduce) {
      if (fill) fill.style.width = "100%";
      if (pct) pct.textContent = "100";
      done();
      return;
    }
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 16 + 5;
      if (p >= 100) p = 100;
      if (fill) fill.style.width = p + "%";
      if (pct) pct.textContent = Math.floor(p);
      if (status) status.textContent = msgs[Math.min(msgs.length - 1, Math.floor((p / 100) * msgs.length))];
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(done, 350);
      }
    }, 180);
  }

  function hideLoader() {
    const loader = document.getElementById("loader");
    if (!loader) return;
    loader.classList.add("done");
    document.body.classList.remove("locked");
    setTimeout(() => (loader.style.display = "none"), 650);
  }

  /* ---------- Rotating subtitle ---------- */
  function rotateSubtitle() {
    const el = document.getElementById("rot-word");
    if (!el) return;
    const words = [
      "intelligent software",
      "AI products",
      "full-stack experiences",
      "privacy-first software",
      "intelligent automation",
    ];
    if (reduce) return;
    let i = 0;
    setInterval(() => {
      el.classList.add("swap");
      setTimeout(() => {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove("swap");
      }, 500);
    }, 3200);
  }

  /* ---------- Animated tech chips: float + mouse repulsion ---------- */
  function initTechCloud() {
    const cloud = document.getElementById("tech-cloud");
    if (!cloud) return;
    const chips = Array.from(cloud.querySelectorAll(".chip-float"));
    chips.forEach((c, i) => {
      c.style.setProperty("--fd", `${4 + (i % 4)}s`);
      c.style.animationDelay = `${(i * 0.27).toFixed(2)}s`;
    });
    if (reduce) return;
    cloud.addEventListener("pointermove", (e) => {
      const cx = e.clientX, cy = e.clientY;
      chips.forEach((c) => {
        const r = c.getBoundingClientRect();
        const dx = r.left + r.width / 2 - cx;
        const dy = r.top + r.height / 2 - cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 72) {
          const force = (72 - dist) / 72;
          c.style.transform = `translate(${(dx / dist) * force * 26}px,${(dy / dist) * force * 26}px)`;
        } else {
          c.style.transform = "";
        }
      });
    });
    cloud.addEventListener("pointerleave", () => {
      chips.forEach((c) => (c.style.transform = ""));
    });
  }

  /* ---------- Status panel tiny tilt ---------- */
  function initStatusTilt() {
    const panel = document.getElementById("ai-status");
    if (!panel || reduce) return;
    panel.addEventListener("pointermove", (e) => {
      const r = panel.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      panel.style.transform = `perspective(700px) rotateY(${px * 3}deg) rotateX(${-py * 2}deg)`;
    });
    panel.addEventListener("pointerleave", () => {
      panel.style.transform = "";
    });
  }

  /* ---------- Button ripple ---------- */
  function initRipple() {
    document.querySelectorAll("[data-ripple]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const r = btn.getBoundingClientRect();
        const size = Math.max(r.width, r.height);
        const rip = document.createElement("span");
        rip.className = "ripple";
        rip.style.width = rip.style.height = `${size}px`;
        rip.style.left = `${e.clientX - r.left - size / 2}px`;
        rip.style.top = `${e.clientY - r.top - size / 2}px`;
        btn.appendChild(rip);
        setTimeout(() => rip.remove(), 600);
      });
    });
  }

  /* ---------- Hero parallax: subtle heading only (status panel has own tilt) ---------- */
  function initHeroParallax() {
    if (reduce) return;
    const hero = document.getElementById("home");
    const name = hero && hero.querySelector(".hero-name");
    if (!hero || !name) return;
    let raf = null,
      tx = 0,
      ty = 0;
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    hero.addEventListener("pointerleave", () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    let nx = 0,
      ny = 0;
    function apply() {
      nx += (tx - nx) * 0.08;
      ny += (ty - ny) * 0.08;
      name.style.transform = `translate3d(${nx * 14}px,${ny * 8}px,0)`;
      if (Math.abs(tx - nx) > 0.001 || Math.abs(ty - ny) > 0.001) {
        raf = requestAnimationFrame(apply);
      } else {
        raf = null;
      }
    }
  }
  /* ---------- orphan terminal removed ---------- */
  if (false) { // dead: removed terminal
    const seq = [
      ["cmd", "> booting portfolio..."],
      ["ok", "✓ AI Core Initialized"],
      ["ok", "✓ Neural Interface Connected"],
      ["ok", "✓ Loading Developer Profile..."],
      ["gap", ""],
      ["cmd", "> whoami"],
      ["val", "Tushar Bhatt"],
      ["cmd", "> role"],
      ["val", "Full Stack AI Developer"],
      ["cmd", "> specialization"],
      ["val", "Artificial Intelligence"],
      ["val", "Web Development"],
      ["val", "Automation"],
      ["cmd", "> current_status"],
      ["dim", "Building futuristic products."],
      ["cmd", "> availability"],
      ["val", "Open to internships"],
    ];

    // Cursor element lives at the end permanently.
    const cursor = document.createElement("span");
    cursor.className = "term-cursor";

    // Reduced motion / no-JS-timing: render instantly, no typing.
    if (reduce) {
      seq.forEach(([cls, text]) => {
        const line = document.createElement("div");
        line.className = "term-line";
        if (cls !== "gap") line.innerHTML = wrapClass(cls, text);
        else line.innerHTML = " ";
        body.appendChild(line);
      });
      body.appendChild(cursor);
      return;
    }

    let li = 0;
    function nextLine() {
      if (li >= seq.length) {
        body.appendChild(cursor); // park blinking cursor forever
        return;
      }
      const [cls, text] = seq[li++];
      const line = document.createElement("div");
      line.className = "term-line";
      body.appendChild(line);
      body.appendChild(cursor); // keep cursor trailing while typing
      if (cls === "gap") {
        line.innerHTML = " ";
        setTimeout(nextLine, 120);
        return;
      }
      typeInto(line, cls, text, () => setTimeout(nextLine, 180));
    }

    function typeInto(line, cls, text, done) {
      let ci = 0;
      (function step() {
        ci++;
        line.innerHTML = wrapClass(cls, text.slice(0, ci));
        line.appendChild(cursor); // cursor rides the caret
        if (ci >= text.length) return done();
        setTimeout(step, 40 + Math.random() * 20); // 40–60ms/char
      })();
    }

    function wrapClass(cls, text) {
      const safe = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const map = { ok: "ok", cmd: "cmd", val: "val", dim: "dim" };
      const c = map[cls];
      return c ? `<span class="${c}">${safe}</span>` : safe;
    }
  } // end dead terminal block

  /* ---------- Hero parallax: subtle heading + terminal follow ---------- */
  function initHeroParallax() {
    if (reduce) return;
    const hero = document.getElementById("home");
    const name = hero && hero.querySelector(".hero-name");
    if (!hero || !name) return;
    let raf = null,
      tx = 0,
      ty = 0;
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    hero.addEventListener("pointerleave", () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    let nx = 0,
      ny = 0;
    function apply() {
      nx += (tx - nx) * 0.08;
      ny += (ty - ny) * 0.08;
      name.style.transform = `translate3d(${nx * 14}px,${ny * 8}px,0)`;
      if (Math.abs(tx - nx) > 0.001 || Math.abs(ty - ny) > 0.001) {
        raf = requestAnimationFrame(apply);
      } else {
        raf = null;
      }
    }
  }

  /* ---------- Three.js background particle field ---------- */
  /* Theme-aware 3D colors: dark bg → bright + additive; light bg → dark + normal */
  function threePalette() {
    const light = document.documentElement.getAttribute("data-theme") === "light";
    return {
      light,
      particle: light ? 0x0ea97a : 0x2bf5b0,
      particleBlend: light ? THREE.NormalBlending : THREE.AdditiveBlending,
      particleOpacity: light ? 0.55 : 0.85,
      wire: light ? 0x0ea97a : 0x2bf5b0,
      wireOpacity: light ? 0.55 : 0.7,
      sky: light ? 0x1f8fd6 : 0x54c7ff,
      ringOpacity: light ? 0.5 : 0.4,
    };
  }

  function initField() {
    if (typeof window.THREE === "undefined") return;
    const canvas = document.getElementById("bg-canvas");
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    cam.position.z = 14;

    const COUNT = reduce ? 600 : 1500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pal = threePalette();
    const mat = new THREE.PointsMaterial({
      size: 0.06,
      color: pal.particle,
      transparent: true,
      opacity: pal.particleOpacity,
      blending: pal.particleBlend,
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    canvasMats.particle = mat;

    const mouse = { x: 0, y: 0 };
    window.addEventListener("pointermove", (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function resize() {
      const w = window.innerWidth,
        h = window.innerHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    let raf;
    function loop() {
      const sv = window.__scrollVel || 0;
      pts.rotation.y += 0.0006 + sv * 0.0006;
      pts.rotation.x += 0.0002 + sv * 0.0003;
      cam.position.x += (mouse.x * 2 - cam.position.x) * 0.04;
      cam.position.y += (-mouse.y * 2 - cam.position.y) * 0.04;
      cam.lookAt(scene.position);
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    }
    if (!reduce) loop();
    else renderer.render(scene, cam);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce) loop();
    });
  }

  /* ---------- Hero orb (small canvas) ---------- */
  function initOrb() {
    if (typeof window.THREE === "undefined") return;
    const canvas = document.getElementById("orb-canvas");
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    cam.position.z = 3.2;
    const geo = new THREE.IcosahedronGeometry(1.1, 1);
    const pal = threePalette();
    const wires = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({ color: pal.wire, transparent: true, opacity: pal.wireOpacity })
    );
    scene.add(wires);
    canvasMats.wire = wires.material;
    function resize() {
      const r = canvas.getBoundingClientRect();
      const w = r.width || 300,
        h = r.height || 400;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);
    function loop() {
      wires.rotation.y += 0.006;
      wires.rotation.x += 0.003;
      renderer.render(scene, cam);
      requestAnimationFrame(loop);
    }
    if (!reduce) loop();
    else renderer.render(scene, cam);
  }

  /* ---------- AI Neural Interface (brand-new interactive section) ---------- */
  function initNeural() {
    const section = document.getElementById("skills");
    if (!section) return;
    const stage = document.getElementById("neural-stage");
    const nodesWrap = document.getElementById("neural-nodes");
    const linksG = document.getElementById("neural-links-g");
    const panel = document.getElementById("neural-panel");
    if (!stage || !nodesWrap || !linksG || !panel) return;

    const NODES = {
      ai: {
        title: "AI Engineering",
        status: "ACTIVE",
        desc: "Building intelligent systems powered by Machine Learning, Computer Vision, LLMs, and automation workflows.",
        tech: ["Python", "TensorFlow", "MediaPipe", "Machine Learning", "LLMs", "Computer Vision", "OpenCV"],
        projects: ["VoiceLegal", "Jarvis", "ISL Bridge", "RetirePRO AI"],
        intern: ["Pinnacle Labs", "CodeSoft"],
      },
      full: {
        title: "Full Stack Development",
        status: "ONLINE",
        desc: "Developing scalable full-stack web applications from frontend interfaces to backend APIs.",
        tech: ["React", "JavaScript", "Node.js", "MongoDB", "REST APIs", "HTML", "CSS", "Express"],
        projects: ["BotForge", "Tunexa", "RetirePRO", "my-portfolio"],
        intern: ["Syslaan IT Solutions"],
      },
      backend: {
        title: "Backend Systems",
        status: "CONNECTED",
        desc: "Building APIs, databases, authentication systems, and scalable server-side architecture.",
        tech: ["FastAPI", "Node.js", "Express", "MongoDB", "SQLite", "REST API", "Auth"],
        projects: ["Tunexa", "RetirePRO", "VoiceLegal"],
        intern: ["Syslaan IT Solutions", "Pinnacle Labs"],
      },
      mobile: {
        title: "Mobile Development",
        status: "READY",
        desc: "Creating cross-platform mobile applications with modern frameworks and AI-powered experiences.",
        tech: ["Flutter", "React Native", "Expo", "Android", "Dart"],
        projects: ["Language Translator", "ISL Bridge"],
        intern: ["Pinnacle Labs"],
      },
      auto: {
        title: "Automation",
        status: "ACTIVE",
        desc: "Developing intelligent automation workflows and AI-assisted productivity systems.",
        tech: ["Python", "Automation", "OCR", "MediaPipe", "FastAPI", "Playwright"],
        projects: ["Map-Scrapper", "Jarvis", "BotForge"],
        intern: ["CodeSoft", "Pinnacle Labs"],
      },
      cloud: {
        title: "Cloud & DevOps",
        status: "ONLINE",
        desc: "Managing deployment pipelines, version control, and production environments.",
        tech: ["Git", "GitHub", "Docker", "CI/CD", "Deployment", "Vercel"],
        projects: ["Tunexa", "my-portfolio", "RetirePRO"],
        intern: ["Syslaan IT Solutions"],
      },
    };

    const nodeEls = Array.from(nodesWrap.querySelectorAll(".neural-node"));
    const title = document.getElementById("np-title");
    const statusTxt = document.getElementById("np-status-txt");
    const desc = document.getElementById("np-desc");
    const techWrap = document.getElementById("np-tech");
    const projWrap = document.getElementById("np-projects");
    const internWrap = document.getElementById("np-intern");

    // Map SVG viewBox coordinates (1000x700) for the core + each node.
    const VB = { w: 1000, h: 700 };
    const CORE = { x: 500, y: 350 };
    const RING = 270; // matches CSS --ring scaled into viewBox

    const nodeVB = (el) => {
      const a = (parseFloat(el.style.getPropertyValue("--a")) || 0) * (Math.PI / 180);
      return {
        x: CORE.x + Math.sin(a) * RING,
        y: CORE.y - Math.cos(a) * RING,
      };
    };

    // Draw neural connection paths core -> each node.
    const paths = {};
    const SVGNS = "http://www.w3.org/2000/svg";
    nodeEls.forEach((el) => {
      const key = el.dataset.node;
      const p = nodeVB(el);
      const path = document.createElementNS(SVGNS, "line");
      path.setAttribute("x1", CORE.x);
      path.setAttribute("y1", CORE.y);
      path.setAttribute("x2", p.x.toFixed(1));
      path.setAttribute("y2", p.y.toFixed(1));
      path.setAttribute("class", "nl-path");
      linksG.appendChild(path);
      paths[key] = path;
    });

    const makeTags = (wrap, items, cls) => {
      wrap.innerHTML = "";
      if (!items.length) {
        const e = document.createElement("span");
        e.className = "np-tag empty";
        e.textContent = "—";
        wrap.appendChild(e);
        return;
      }
      items.forEach((t, i) => {
        const s = document.createElement("span");
        s.className = "np-tag" + (cls ? " " + cls : "");
        s.textContent = t;
        s.style.animationDelay = i * 0.04 + "s";
        wrap.appendChild(s);
      });
    };

    const select = (key) => {
      const d = NODES[key];
      if (!d) return;
      nodeEls.forEach((n) => n.classList.toggle("sel", n.dataset.node === key));
      stage.classList.add("excited");
      Object.entries(paths).forEach(([k, p]) => {
        p.classList.toggle("hot", k === key);
        p.classList.toggle("dim", k !== key);
      });
      title.textContent = d.title;
      statusTxt.textContent = d.status;
      desc.textContent = d.desc;
      makeTags(techWrap, d.tech);
      makeTags(projWrap, d.projects, "proj");
      makeTags(internWrap, d.intern, "intern");
      panel.classList.add("show");
    };

    const clearSel = () => {
      nodeEls.forEach((n) => n.classList.remove("sel"));
      stage.classList.remove("excited");
      Object.values(paths).forEach((p) => p.classList.remove("hot", "dim"));
      panel.classList.remove("show");
    };

    nodeEls.forEach((el) => {
      const key = el.dataset.node;
      el.addEventListener("mouseenter", () => select(key));
      el.addEventListener("focus", () => select(key));
      el.addEventListener("click", (e) => {
        e.preventDefault();
        select(key);
      });
      el.addEventListener("mouseleave", clearSel);
      el.addEventListener("blur", clearSel);
    });

    // Core click resets the interface back to standby.
    const core = document.getElementById("neural-core");
    if (core) core.addEventListener("click", clearSel);

    // Pointer-parallax: core drifts gently toward the cursor inside the stage.
    if (!reduce) {
      stage.addEventListener("pointermove", (e) => {
        const r = stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        const coreEl = stage.querySelector(".neural-core");
        if (coreEl) coreEl.style.transform = `translate(${px * 26}px, ${py * 26}px)`;
      });
      stage.addEventListener("pointerleave", () => {
        const coreEl = stage.querySelector(".neural-core");
        if (coreEl) coreEl.style.transform = "";
      });
    }
  }

  /* ---------- Custom cursor + magnetic ---------- */
  function initCursor() {
    const cur = document.getElementById("cursor");
    const dot = document.getElementById("cursor-dot");
    if (!cur || !dot) return;
    let x = 0,
      y = 0,
      dx = 0,
      dy = 0;
    window.addEventListener("pointermove", (e) => {
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    });
    function loop() {
      dx += (x - dx) * 0.18;
      dy += (y - dy) * 0.18;
      cur.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    }
    loop();
    document.querySelectorAll("a,button,[data-magnetic]").forEach((el) => {
      el.addEventListener("pointerenter", () => cur.classList.add("hover"));
      el.addEventListener("pointerleave", () => {
        cur.classList.remove("hover");
        if (el.hasAttribute("data-magnetic") && !reduce) gsap.to(el, { x: 0, y: 0, duration: 0.4 });
      });
    });
    if (!reduce) {
      document.querySelectorAll("[data-magnetic]").forEach((el) => {
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const mx = e.clientX - r.left - r.width / 2;
          const my = e.clientY - r.top - r.height / 2;
          gsap.to(el, { x: mx * 0.3, y: my * 0.3, duration: 0.4, ease: "power2.out" });
        });
      });
    }
  }

  /* ---------- Nav: scrolled state + active link + mobile ---------- */
  function initNav() {
    const nav = document.getElementById("navbar");
    const burger = document.getElementById("nav-burger");
    const onScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    if (burger && nav) {
      burger.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        burger.setAttribute("aria-expanded", String(open));
      });
      nav.querySelectorAll(".nav-links a").forEach((a) =>
        a.addEventListener("click", () => {
          nav.classList.remove("open");
          burger.setAttribute("aria-expanded", "false");
        })
      );
    }
    const links = Array.from(document.querySelectorAll(".nav-links a[href^='#']"));
    const sections = links
      .map((a) => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);
    if ("IntersectionObserver" in window && sections.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              const id = "#" + en.target.id;
              links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === id));
            }
          });
        },
        { rootMargin: "-45% 0px -50% 0px" }
      );
      sections.forEach((s) => io.observe(s));
    }
  }

  /* ---------- Theme toggle ---------- */
  function initTheme() {
    const btn = document.getElementById("nav-theme");
    const KEY = "tb-theme";
    const saved = localStorage.getItem(KEY);
    if (saved === "light") document.documentElement.setAttribute("data-theme", "light");
    if (!btn) return;
    const apply = (on) => {
      document.documentElement.setAttribute("data-theme", on ? "light" : "dark");
      btn.setAttribute("aria-label", on ? "Toggle dark mode" : "Toggle light mode");
    };
    apply(document.documentElement.getAttribute("data-theme") === "light");
    btn.addEventListener("click", () => {
      const on = document.documentElement.getAttribute("data-theme") !== "light";
      apply(on);
      recolor3D();
      try { localStorage.setItem(KEY, on ? "light" : "dark"); } catch (e) { }
    });
  }

  /* ---------- Work carousel ---------- */
  function initWork() {
    const track = document.getElementById("work-track");
    const nav = document.getElementById("work-nav");
    const dotsWrap = document.getElementById("work-dots");
    const prev = document.getElementById("work-prev");
    const next = document.getElementById("work-next");
    if (!track) return;
    const slides = track.children.length;
    let i = 0;
    const dots = [];
    if (dotsWrap) {
      for (let d = 0; d < slides; d++) {
        const dot = document.createElement("i");
        dot.dataset.i = d;
        if (d === 0) dot.classList.add("on");
        dotsWrap.appendChild(dot);
        dots.push(dot);
      }
    }
    function go(n) {
      i = (n + slides) % slides;
      track.style.transform = `translateX(${-i * 100}%)`;
      if (nav) nav.querySelectorAll("li").forEach((li, k) => li.classList.toggle("active", k === i));
      dots.forEach((dt, k) => dt.classList.toggle("on", k === i));
    }
    if (next) next.addEventListener("click", () => go(i + 1));
    if (prev) prev.addEventListener("click", () => go(i - 1));
    if (nav)
      nav.querySelectorAll("li").forEach((li) =>
        li.addEventListener("click", () => go(+li.dataset.i))
      );
    dots.forEach((dt) => dt.addEventListener("click", () => go(+dt.dataset.i)));

    // Real deployed demos — fill these in as they go live. Links stay hidden until set.
    const demos = {
      "retiredpro": "",            // e.g. "https://retirepro.onrender.com"
      "tunexa": "",                // e.g. "https://tunexa.onrender.com"
      "BotForge": "",
      "jarvis": "",
      "indiansignlanguage": "",
    };
    document.querySelectorAll(".ws-demo[data-demo]").forEach((a) => {
      const slide = a.closest(".work-slide");
      const title = slide && slide.querySelector("h3") ? slide.querySelector("h3").textContent.trim() : "";
      const url = demos[title] || "";
      if (url) {
        a.href = url;
      } else {
        a.style.display = "none";
      }
    });
  }

  /* ---------- Counters ---------- */
  function animateCounters(scope) {
    document.querySelectorAll(".counter").forEach((el) => {
      const target = parseFloat(el.dataset.target);
      const dec = parseInt(el.dataset.dec || "0", 10);
      if (reduce) {
        el.textContent = target.toFixed(dec);
        return;
      }
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => (el.textContent = obj.v.toFixed(dec)),
        scrollTrigger: scope && { trigger: el, start: "top 90%" },
      });
    });
  }

  /* ---------- Stage card 3D tilt ---------- */
  function initTilt() {
    if (reduce) return;
    // Tilt on touch fights scrolling — desktop pointer only.
    if (window.matchMedia("(pointer:coarse)").matches) return;
    const tilt = (card, max) => {
      if (!card) return;
      card.style.transformStyle = "preserve-3d";
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotateY: px * max, rotateX: -py * max, duration: 0.4, ease: "power2.out" });
      });
      card.addEventListener("pointerleave", () =>
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "power2.out" })
      );
    };
    tilt(document.getElementById("stage-card"), 14);
    document.querySelectorAll(".work-slide").forEach((s) => tilt(s, 8));
    document.querySelectorAll(".repo").forEach((c) => tilt(c, 7));
    document.querySelectorAll(".cert").forEach((c) => tilt(c, 7));
  }

  /* ---------- Reveal animations (ScrollTrigger) ---------- */
  function initReveals() {
    if (!hasGSAP) {
      document.querySelectorAll(".reveal").forEach((el) => (el.style.opacity = 1));
      animateCounters(false);
      return;
    }
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Hero entrance timeline — use fromTo so final opacity is explicit (avoids
      // GSAP leaving .reveal elements at opacity:0 when CSS already sets 0).
      const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });
      tl.fromTo(".hero .eyebrow", { y: 20, opacity: 0 }, { y: 0, opacity: 1 })
        .fromTo(".hero-hi", { y: 16, opacity: 0 }, { y: 0, opacity: 1 }, "-=0.6")
        .fromTo(".hero-im", { y: 16, opacity: 0 }, { y: 0, opacity: 1 }, "-=0.7")
        .fromTo(".hero-name .line", { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.12 }, "-=0.5")
        .fromTo(".hero-role", { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, "-=0.4")
        .fromTo(".hero-bio", { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, "-=0.6")
        .fromTo(".ai-status", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.55")
        .fromTo(".tech-cloud", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.55")
        .fromTo(".hero-actions", { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, "-=0.45")
        .fromTo(".hero-stage", { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1 }, "-=1.1");

      // Scroll reveals per section
      gsap.utils.toArray(".section").forEach((sec) => {
        const items = sec.querySelectorAll("[data-reveal]");
        if (!items.length) return;
        gsap.to(items, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: sec, start: "top 78%" },
        });
      });

      animateCounters(true);
      initTilt();
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      document.querySelectorAll(".reveal").forEach((el) => (el.style.opacity = 1));
      animateCounters(false);
    });
  }

  /* ---------- Repos: live GitHub data + hover tech-stack ---------- */
  const LANG_COLORS = {
    JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
    HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051", Vue: "#41b883",
    Go: "#00ADD8", Rust: "#dea584", Java: "#b07219", C: "#555555",
    "C++": "#f34b7d", Ruby: "#701516", PHP: "#4F5D95", Swift: "#F05138",
    Kotlin: "#A97BFF", Dart: "#00B4AB", Jupyter: "#DA5B0B",
  };
  function renderStack(el, tags) {
    if (!el || !tags || !tags.length) return;
    const rows = tags
      .slice(0, 6)
      .map((t, idx) => {
        // Handle both "name::pct" format and simple name format
        // Split on first "::" to preserve potential "::" in name
        const splitIdx = t.indexOf("::");
        const name = splitIdx !== -1 ? t.substring(0, splitIdx) : t;
        const pctRaw = splitIdx !== -1 ? t.substring(splitIdx + 2) : "";

        const color = LANG_COLORS[name] || "#8b97a8";
        // Calculate percentage: use provided value or fall back to spread
        let pct;
        if (pctRaw && pctRaw !== "") {
          const parsed = parseInt(pctRaw, 10);
          pct = isNaN(parsed) ? 100 - idx * 16 : Math.max(8, Math.min(100, parsed));
        } else {
          pct = 100 - idx * 16;
        }

        return `<div class="tech">
          <span class="t-name"><i style="--c:${color}"></i>${name}</span>
          <span class="t-pct">${pct}%</span>
          <span class="t-bar"><span class="t-fill" style="--w:${pct}%"></span></span>
        </div>`;
      })
      .join("");
    el.innerHTML = `<div class="stack-head">⚡ Tech Stack</div><div class="stack-list">${rows}</div>`;
  }

  function initLiveRepos() {
    const grid = document.getElementById("repo-grid");
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll(".repo"));
    const byName = {};
    cards.forEach((c) => {
      const m = (c.getAttribute("href") || "").match(/github\.com\/[^/]+\/([^/]+)$/);
      if (m) byName[decodeURIComponent(m[1])] = c;
    });
    fetch("https://api.github.com/users/tusharbhatt-24/repos?per_page=100&sort=updated")
      .then((r) => (r.ok ? r.json() : []))
      .then((repos) => {
        if (!Array.isArray(repos)) return;
        repos.forEach((repo) => {
          const card = byName[repo.name];
          if (!card) return;
          const star = card.querySelector(".repo-star");
          if (star)
            star.textContent = `★ ${repo.stargazers_count}  ◆ ${repo.forks_count}`;
          const lang = card.querySelector(".repo-lang");
          if (lang && repo.language && !lang.textContent.trim()) {
            lang.innerHTML = `<i style="--c:${LANG_COLORS[repo.language] || "#8b97a8"}"></i>${repo.language}`;
          }
          if (repo.description) {
            const d = card.querySelector(".repo-desc");
            if (d && !d.textContent.trim()) d.textContent = repo.description;
          }
          // Tech stack = ONLY the repo's real languages from GitHub (main stack).
          const stackEl = card.querySelector(".repo-stack");
          const fill = (tags) => { if (tags && tags.length) renderStack(stackEl, tags); };
          // Baseline: GitHub's primary language is in the list response, so the
          // hover popup is populated immediately — the row-mate "shift" has content to reveal.
          if (repo.language) fill([repo.language]);
          // Enrich with the real per-language percentages when the languages API resolves.
          if (repo.languages_url) {
            fetch(repo.languages_url)
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (!data) return;
                const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
                if (!entries.length) return;
                const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
                fill(entries
                  .slice(0, 4)
                  .map(([name, v]) => `${name}::${Math.round((v / total) * 100)}`));
              })
              .catch(() => { });
          }
        });
      })
      .catch(() => { });
  }

  /* ---------- Repos: see more ---------- */
  function initRepos() {
    const grid = document.getElementById("repo-grid");
    const btn = document.getElementById("repo-more");
    if (!grid || !btn) return;
    const extras = grid.querySelectorAll(".repo[data-more]");
    if (!extras.length) {
      btn.style.display = "none";
      return;
    }
    btn.insertAdjacentHTML(
      "beforeend",
      ` <span class="count">(${extras.length})</span>`
    );
    btn.addEventListener("click", () => {
      const open = grid.classList.toggle("expanded");
      btn.firstChild.textContent = open ? "Show less repositories " : "See more repositories ";
      btn.querySelector("span[aria-hidden]").textContent = open ? "↑" : "↓";
      if (open && window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  /* ---------- Repos: open physical space for the popup; every row-mate moves away ---------- */
  function initRepoShift() {
    const grid = document.getElementById("repo-grid");
    if (!grid || window.innerWidth <= 720) return;
    const POP = 248; // panel width (230) + grid gap (18): guarantees no overlap
    const cards = Array.from(grid.querySelectorAll(".repo"));
    const shift = (el, x) => {
      if (!el) return;
      if (hasGSAP) gsap.to(el, { x, duration: 0.55, ease: "back.out(1.6)" });
      else el.style.transform = x ? `translateX(${x}px)` : "";
    };
    // siblings sharing the same visual row as a given card
    const rowMates = (card) => {
      const top = card.getBoundingClientRect().top;
      return cards.filter((c) => c !== card && Math.abs(c.getBoundingClientRect().top - top) < 8);
    };

    cards.forEach((card) => {
      const enter = () => {
        const r = card.getBoundingClientRect();
        const vw = window.innerWidth;
        const roomRight = vw - r.right - 12; // space before the viewport's right edge
        const roomLeft = r.left - 12; // space before the viewport's left edge
        // Open toward whichever side has more room; flip only if it would clip off-screen.
        let goRight = roomRight >= roomLeft;
        if (goRight && roomRight < POP) goRight = false;
        else if (!goRight && roomLeft < POP) goRight = true;

        card.classList.toggle("stack-right", goRight);
        card.classList.toggle("stack-left", !goRight);

        // Every other card in the same row vacates by sliding AWAY from the hovered one.
        rowMates(card).forEach((mate) => {
          const mr = mate.getBoundingClientRect();
          // mate is to the right of the hovered card -> push it further right
          if (mr.left >= r.left - 6) shift(mate, POP);
          else shift(mate, -POP); // mate is to the left -> push it left
        });
      };
      const leave = () => {
        card.classList.remove("stack-right", "stack-left");
        cards.forEach((c) => shift(c, 0));
      };
      card.addEventListener("mouseenter", enter);
      card.addEventListener("mouseleave", leave);
      card.addEventListener("focusin", enter);
      card.addEventListener("focusout", leave);
    });
  }

  /* ---------- Section transitions: continuous AI-interface flow ---------- */
  function initTransitions() {
    if (!("IntersectionObserver" in window)) {
      const intro = document.getElementById("exp-intro");
      if (intro) intro.classList.add("done");
      return;
    }

    // Scroll-driven fill for a connector line between two sections.
    const fillOnScroll = (fillEl, fromEl) => {
      if (!fillEl || !fromEl) return;
      let ticking = false;
      const update = () => {
        const r = fromEl.getBoundingClientRect();
        const vh = window.innerHeight;
        const passed = Math.min(Math.max(vh - r.bottom, 0), 160);
        fillEl.style.height = Math.min(100, (passed / 160) * 100) + "%";
        ticking = false;
      };
      const onScroll = () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      update();
    };

    fillOnScroll(document.getElementById("sc-repo-fill"), document.getElementById("experience"));

    // Experience intro boot sequence is disabled for instant load:
    // the intro overlay stays hidden (see .exp-intro CSS) so the
    // timeline and cards reveal immediately as the section scrolls in.
    const intro = document.getElementById("exp-intro");
    if (intro) intro.classList.add("done");

    // Energy pulse into the Repositories connector as Experience scrolls out.
    const repoPulse = document.getElementById("sc-repo-pulse");
    const expSection = document.getElementById("experience");
    if (repoPulse && expSection && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && en.boundingClientRect.top > 0) {
            io.disconnect();
            if (repoPulse) setTimeout(() => repoPulse.classList.add("go"), 500);
          }
        });
      }, { threshold: 0.5 });
      io.observe(expSection);
    }
  }

  /* ---------- Certificates: holographic vault ---------- */
  function initCertVault() {
    const vault = document.getElementById("certificates");
    if (!vault) return;
    const accs = Array.from(vault.querySelectorAll(".acc"));
    const coarse = window.matchMedia("(pointer:coarse)").matches;

    // ---- Accordion: click toggles, hover opens, scroll auto-closes ----
    const setOpen = (acc, open) => {
      acc.classList.toggle("open", open);
      const head = acc.querySelector(".acc-head");
      if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
    };
    accs.forEach((acc) => {
      const head = acc.querySelector(".acc-head");
      if (!head) return;
      // Click always toggles (primary control on touch + desktop).
      head.addEventListener("click", () => setOpen(acc, !acc.classList.contains("open")));
      // Hover-open is desktop-only: on touch, pointerenter/leave fire on tap and
      // would open then instantly close the accordion.
      if (coarse) return;
      let hoverTimer = null;
      acc.addEventListener("pointerenter", () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => setOpen(acc, true), 90);
      });
      acc.addEventListener("pointerleave", () => {
        clearTimeout(hoverTimer);
        setOpen(acc, false);
      });
    });

    // Auto-close all accordions when the user scrolls away from the section.
    let scrollTimer = null;
    const onScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const r = vault.getBoundingClientRect();
        const inView = r.bottom > 0 && r.top < window.innerHeight;
        if (!inView) accs.forEach((a) => setOpen(a, false));
      }, 220);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // ---- 3D tilt + mouse lighting (NO flip — click opens modal directly) ----
    const cards = Array.from(vault.querySelectorAll(".cert"));
    cards.forEach((card) => {
      const face = card.querySelector(".cert-inner");
      if (!face) return;
      let raf = null;
      let tx = 0, ty = 0;

      const onMove = (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        if (reduce) return;
        tx = (py - 0.5) * -10; // rotateX
        ty = (px - 0.5) * 14;  // rotateY
        if (!raf) raf = requestAnimationFrame(() => {
          card.style.setProperty("--rx", tx.toFixed(2) + "deg");
          card.style.setProperty("--ry", ty.toFixed(2) + "deg");
          raf = null;
        });
      };
      const onLeave = () => {
        if (!reduce) {
          card.style.setProperty("--rx", "0deg");
          card.style.setProperty("--ry", "0deg");
        }
      };

      if (!reduce && !coarse) {
        card.addEventListener("pointermove", onMove);
        card.addEventListener("pointerleave", onLeave);
      }
      // Any click on the card opens the final modal directly (no preview stage).
      card.addEventListener("click", (e) => {
        e.preventDefault();
        openModal({
          img: card.dataset.img,
          title: card.dataset.title,
          issuer: card.dataset.issuer,
          cat: card.dataset.cat,
          date: card.dataset.date,
          desc: card.dataset.desc,
          skills: card.dataset.skills,
        });
      });
    });

    // ---- Certificate showcase modal ----
    const modal = document.getElementById("cert-modal");
    if (!modal) return;
    const mImg = document.getElementById("cm-img");
    const mImgWrap = document.getElementById("cm-imgwrap");
    const mTitle = document.getElementById("cm-title");
    const mIssuer = document.getElementById("cm-issuer");
    const mBadge = document.getElementById("cm-badge");
    const mDate = document.getElementById("cm-date");
    const mStatus = document.getElementById("cm-status");
    const mDesc = document.getElementById("cm-desc");
    const mSkills = document.getElementById("cm-skills");

    const makeTags = (wrap, items) => {
      wrap.innerHTML = "";
      items.slice(0, 8).forEach((s) => {
        const t = document.createElement("span");
        t.className = "cm-tag";
        t.textContent = s;
        wrap.appendChild(t);
      });
    };

    const openModal = (data) => {
      const img = data.img;
      if (img) {
        mImg.src = img;
        mImgWrap.classList.remove("empty");
        mImg.style.display = "";
      } else {
        mImg.removeAttribute("src");
        mImg.style.display = "none";
        mImgWrap.classList.add("empty");
      }
      mTitle.innerHTML = data.title || "Certificate";
      mIssuer.textContent = data.issuer || "";
      mBadge.textContent = data.cat || "Certificate";
      mDate.textContent = data.date || "—";
      mStatus.textContent = "✓ Verified";
      mDesc.textContent = data.desc || "";
      const skills = (data.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
      makeTags(mSkills, skills);
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
    };
    const closeModal = () => {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      mImgWrap.style.setProperty("--px", "0px");
      mImgWrap.style.setProperty("--py", "0px");
    };

    // Subtle mouse parallax on the certificate preview (desktop pointer only).
    if (!reduce && !coarse) {
      mImgWrap.addEventListener("pointermove", (e) => {
        const r = mImgWrap.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        mImgWrap.style.setProperty("--px", (px * 10).toFixed(1) + "px");
        mImgWrap.style.setProperty("--py", (py * 10).toFixed(1) + "px");
      });
      mImgWrap.addEventListener("pointerleave", () => {
        mImgWrap.style.setProperty("--px", "0px");
        mImgWrap.style.setProperty("--py", "0px");
      });
    }
    // Clicking the image does nothing (certificate stays inside the modal).
    mImgWrap.addEventListener("click", (e) => e.preventDefault());

    modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    // Experience-section "View Certificate" buttons route into the same single modal.
    document.querySelectorAll(".exp-cert").forEach((btn) => {
      btn.addEventListener("click", () => {
        openModal({
          img: btn.dataset.img,
          title: btn.dataset.title,
          issuer: btn.dataset.issuer,
          cat: btn.dataset.cat,
          date: btn.dataset.date,
          desc: btn.dataset.desc,
          skills: btn.dataset.skills,
        });
      });
    });
  }

  /* ---------- Experience: AI Career Journey timeline ---------- */
  function initExperience() {
    const section = document.getElementById("experience");
    if (!section) return;
    const track = document.getElementById("exp-track");
    const line = document.getElementById("exp-line-fill");
    const items = Array.from(section.querySelectorAll(".exp-item"));
    if (!track) return;

    // Mark milestone states: current = first "Present", upcoming = after current, rest done.
    const currentIdx = items.findIndex((it) =>
      /present/i.test(it.querySelector(".exp-dur")?.textContent || "")
    );
    items.forEach((it, i) => {
      if (currentIdx === -1) return;
      if (i < currentIdx) it.classList.add("done");
      else if (i === currentIdx) it.classList.add("current");
      else it.classList.add("upcoming");
    });
    if (currentIdx === -1 && items.length) items[items.length - 1].classList.add("current");

    // Scroll-driven line fill (transform-friendly: animate height, throttled via rAF)
    if (line) {
      let ticking = false;
      const update = () => {
        const r = track.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = r.height;
        // progress: how far the viewport center has travelled through the track
        const passed = Math.min(Math.max(vh * 0.5 - r.top, 0), total);
        line.style.height = (total ? (passed / total) * 100 : 0) + "%";
        ticking = false;
      };
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      update();
    }

    // Reveal: card fades up, node pulses, chips stagger in. Cursor-reactive tilt.
    if (hasGSAP) {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        items.forEach((it) => {
          const card = it.querySelector(".exp-card");
          const chips = it.querySelectorAll(".exp-chip");
          const node = it.querySelector(".exp-node");
          const tl = gsap.timeline({
            scrollTrigger: { trigger: it, start: "top 82%" },
          });
          tl.fromTo(card, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" })
            .fromTo(node, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" }, "-=0.5")
            .fromTo(chips, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, ease: "power2.out" }, "-=0.3");
        });

        // Card cursor-reactive tilt + border glow (transform only)
        if (!reduce) {
          items.forEach((it) => {
            const card = it.querySelector(".exp-card");
            card.style.transformStyle = "preserve-3d";
            card.addEventListener("pointermove", (e) => {
              const r = card.getBoundingClientRect();
              const px = (e.clientX - r.left) / r.width - 0.5;
              const py = (e.clientY - r.top) / r.height - 0.5;
              gsap.to(card, { rotateY: px * 6, rotateX: -py * 6, y: -6, duration: 0.4, ease: "power2.out" });
            });
            card.addEventListener("pointerleave", () =>
              gsap.to(card, { rotateY: 0, rotateX: 0, y: 0, duration: 0.6, ease: "power2.out" })
            );
          });
        }
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        items.forEach((it) => {
          const card = it.querySelector(".exp-card");
          if (card) card.style.opacity = 1;
        });
      });
    }

    // Node hover ripple (CSS-driven via class, re-trigger on each hover)
    items.forEach((it) => {
      const node = it.querySelector(".exp-node");
      if (!node) return;
      const fire = () => {
        node.classList.remove("rip");
        void node.offsetWidth; // reflow to restart animation
        node.classList.add("rip");
      };
      node.addEventListener("mouseenter", fire);
      node.addEventListener("focus", fire);
    });
  }

  /* ---------- Section progress indicator ---------- */
  function initProgress() {
    const dots = Array.from(document.querySelectorAll("#progress-dots .pd-dot"));
    if (!dots.length) return;
    const map = {};
    dots.forEach((d) => (map[d.dataset.sec] = d));
    const targets = dots
      .map((d) => document.getElementById(d.dataset.sec))
      .filter(Boolean);
    if ("IntersectionObserver" in window && targets.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              dots.forEach((d) => d.classList.remove("active"));
              const active = map[en.target.id];
              if (active) active.classList.add("active");
            }
          });
        },
        { rootMargin: "-45% 0px -50% 0px" }
      );
      targets.forEach((t) => io.observe(t));
    }
  }

  /* ---------- Scroll velocity: kinetic skew + HUD readout + field warp ---------- */
  function initScrollVelocity() {
    if (reduce) return;
    const main = document.getElementById("main");
    const velWrap = document.getElementById("hud-vel");
    const velFill = document.getElementById("hv-fill");
    const velVal = document.getElementById("hv-val");
    if (!main) return;

    // Smoothed scroll velocity (px/frame). Published globally so the particle
    // field can react to scroll speed too.
    let target = 0, current = 0, lastY = window.scrollY, raf = null;
    window.__scrollVel = 0;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const MAX = 90; // px/frame that maps to full intensity

    const onScroll = () => {
      const y = window.scrollY;
      target = y - lastY;
      lastY = y;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    function tick() {
      current += (target - current) * 0.18;
      target *= 0.86;
      if (document.body.classList.contains("modal-open")) { current = target = 0; }

      const v = clamp(current, -MAX, MAX);
      window.__scrollVel = v;

      const skew = clamp(v * 0.045, -4, 4);     // degrees
      const shift = clamp(v * -0.12, -14, 14);   // px — content lags then catches up
      main.style.transform =
        "translate3d(0," + shift.toFixed(2) + "px,0) skewY(" + skew.toFixed(3) + "deg)";

      const pct = Math.min(100, Math.round((Math.abs(v) / MAX) * 100));
      if (velWrap) {
        velWrap.classList.toggle("active", pct > 2);
        velVal.textContent = (v < -0.5 ? "-" : v > 0.5 ? "+" : "") + pct;
      }
      if (velFill) velFill.style.height = pct + "%";

      if (Math.abs(current) < 0.05 && Math.abs(target) < 0.05) {
        main.style.transform = "";
        window.__scrollVel = 0;
        if (velWrap) velWrap.classList.remove("active");
        if (velFill) velFill.style.height = "0%";
        if (velVal) velVal.textContent = "0";
        raf = null;
        return;
      }
      raf = requestAnimationFrame(tick);
    }
  }

  /* ---------- Boot ---------- */
  function boot() {
    initField();
    initOrb();
    initCursor();
    initTheme();
    initNav();
    initWork();
    rotateSubtitle();
    initTechCloud();
    initStatusTilt();
    initRipple();
    initHeroParallax();
    initLiveRepos();
    initRepos();
    initRepoShift();
    initExperience();
    initCertVault();
    initNeural();
    initTransitions();
    initProgress();
    initReveals();
    initScrollVelocity();
  }

  runLoader(() => {
    hideLoader();
    boot();
  });
  // Fallback in case CDN scripts are blocked
  window.addEventListener("load", () => {
    if (document.body.classList.contains("locked")) {
      // loader still up after 4s → force open
      setTimeout(() => {
        if (document.body.classList.contains("locked")) {
          hideLoader();
          boot();
        }
      }, 4000);
    }
  });
})();
