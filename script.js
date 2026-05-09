      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const $ = (s) => document.querySelector(s),
        $$ = (s) => Array.from(document.querySelectorAll(s));
      function fitRenderer(r, c, cam) {
        const b = c.getBoundingClientRect(),
          w = Math.max(1, Math.floor(b.width)),
          h = Math.max(1, Math.floor(b.height));
        r.setPixelRatio(Math.min(devicePixelRatio, 1.6));
        r.setSize(w, h, false);
        if (cam) {
          cam.aspect = w / h;
          cam.updateProjectionMatrix();
        }
      }
      function liquidMat() {
        return new THREE.ShaderMaterial({
          transparent: true,
          uniforms: {
            uTime: { value: 0 },
            uColorA: { value: new THREE.Color("#00ffb2") },
            uColorB: { value: new THREE.Color("#8f5cff") },
          },
          vertexShader:
            "varying vec3 vPos;uniform float uTime;void main(){vPos=position;vec3 p=position;float wave=sin(p.x*5.0+uTime*2.2)*.08+sin(p.y*7.0-uTime*2.7)*.055+sin((p.x+p.z)*4.0+uTime)*.05;p+=normal*wave;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}",
          fragmentShader:
            "varying vec3 vPos;uniform float uTime;uniform vec3 uColorA;uniform vec3 uColorB;void main(){float mixv=.5+.5*sin(vPos.y*5.0+uTime*1.7);vec3 col=mix(uColorA,uColorB,mixv);float rim=smoothstep(.18,.95,length(vPos.xy));gl_FragColor=vec4(col,0.58+rim*.28);}",
        });
      }
      function initLoader() {
        const c = $("#loader-canvas"),
          r = new THREE.WebGLRenderer({
            canvas: c,
            alpha: true,
            antialias: true,
          }),
          s = new THREE.Scene(),
          cam = new THREE.PerspectiveCamera(
            42,
            innerWidth / innerHeight,
            0.1,
            80,
          );
        cam.position.z = 6;
        s.add(new THREE.AmbientLight(0xffffff, 0.45));
        const l = new THREE.PointLight(0x00ffb2, 3, 12);
        l.position.set(2, 2, 4);
        s.add(l);
        const atom = new THREE.Group();
        s.add(atom);
        const mat = liquidMat(),
          core = new THREE.Mesh(new THREE.SphereGeometry(0.62, 64, 64), mat);
        atom.add(core);
        atom.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(0.69, 32, 32),
            new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              roughness: 0.02,
              metalness: 0.1,
              transmission: 0.85,
              transparent: true,
              opacity: 0.22,
            }),
          ),
        );
        const rings = [];
        [
          [0, 0, 0x00ffb2],
          [Math.PI / 3, 0.4, 0x4cc9ff],
          [-Math.PI / 3, -0.6, 0x8f5cff],
        ].forEach((a) => {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.75, 0.012, 12, 160),
            new THREE.MeshBasicMaterial({
              color: a[2],
              transparent: true,
              opacity: 0.82,
            }),
          );
          ring.rotation.set(a[0], a[1], 0);
          atom.add(ring);
          rings.push(ring);
        });
        const es = rings.map((ring, i) => {
          const e = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff }),
          );
          s.add(e);
          return { e, ring, a: i * 2.1, sp: 0.028 + i * 0.006 };
        });
        let p = 0,
          done = false;
        fitRenderer(r, c, cam);
        addEventListener("resize", () => fitRenderer(r, c, cam));
        const start = performance.now();
        function loop(t) {
          if (done) return;
          requestAnimationFrame(loop);
          const time = (t - start) / 1000;
          mat.uniforms.uTime.value = time;
          atom.rotation.y += 0.008;
          atom.rotation.x = Math.sin(time * 0.8) * 0.12;
          rings.forEach((ring, i) => {
            ring.rotation.z += 0.008 + i * 0.003;
            ring.rotation.y += 0.003;
          });
          es.forEach((o) => {
            o.a += o.sp;
            const pos = new THREE.Vector3(
              Math.cos(o.a) * 1.75,
              Math.sin(o.a) * 1.75,
              0,
            );
            o.ring.localToWorld(pos);
            o.e.position.copy(pos);
          });
          p = Math.min(
            100,
            p + (prefersReduced ? 6 : 0.55 + Math.random() * 1.1),
          );
          $("#loader-pct").textContent = Math.floor(p) + "%";
          $("#loader-bar").style.width = p + "%";
          if (p >= 100) {
            done = true;
            setTimeout(() => {
              gsap.to("#loader", {
                opacity: 0,
                duration: 0.55,
                onComplete() {
                  document.body.classList.remove("locked");
                  $("#loader").style.display = "none";
                  startIntro();
                },
              });
            }, 260);
          }
          r.render(s, cam);
        }
        requestAnimationFrame(loop);
      }
      function initBg() {
        const c = $("#bg-canvas"),
          r = new THREE.WebGLRenderer({
            canvas: c,
            alpha: true,
            antialias: false,
          }),
          s = new THREE.Scene(),
          cam = new THREE.PerspectiveCamera(
            60,
            innerWidth / innerHeight,
            0.1,
            120,
          );
        cam.position.z = 18;
        const n = 900,
          pos = new Float32Array(n * 3),
          vel = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          pos[i * 3] = (Math.random() - 0.5) * 46;
          pos[i * 3 + 1] = (Math.random() - 0.5) * 26;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 35;
          vel[i] = 0.004 + Math.random() * 0.012;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        s.add(
          new THREE.Points(
            g,
            new THREE.PointsMaterial({
              color: 0x88fff0,
              size: 1.15,
              sizeAttenuation: false,
              transparent: true,
              opacity: 0.34,
            }),
          ),
        );
        fitRenderer(r, c, cam);
        addEventListener("resize", () => fitRenderer(r, c, cam));
        function loop() {
          requestAnimationFrame(loop);
          for (let i = 0; i < n; i++) {
            pos[i * 3 + 1] += vel[i];
            if (pos[i * 3 + 1] > 15) pos[i * 3 + 1] = -15;
          }
          g.attributes.position.needsUpdate = true;
          s.rotation.y = scrollY * 0.00008;
          r.render(s, cam);
        }
        loop();
      }
      function initOrb() {
        const c = $("#orb-canvas"),
          r = new THREE.WebGLRenderer({
            canvas: c,
            alpha: true,
            antialias: true,
          }),
          s = new THREE.Scene(),
          cam = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
        cam.position.z = 5.8;
        s.add(new THREE.AmbientLight(0xffffff, 0.35));
        s.add(new THREE.PointLight(0x4cc9ff, 2, 10));
        const group = new THREE.Group();
        s.add(group);
        const mat = liquidMat();
        group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 18), mat));
        const wire = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.55, 3),
          new THREE.MeshBasicMaterial({
            color: 0x00ffb2,
            wireframe: true,
            transparent: true,
            opacity: 0.18,
          }),
        );
        group.add(wire);
        ["FULL STACK", "AUTOMATION", "AI", "JS", "CSS", "API"].forEach((txt, i, arr) => {
          const cc = document.createElement("canvas");
          cc.width = 128;
          cc.height = 64;
          const x = cc.getContext("2d");
          x.fillStyle = "rgba(5,7,11,.8)";
          x.fillRect(0, 0, 128, 64);
          x.strokeStyle = "#00ffb2";
          x.strokeRect(4, 4, 120, 56);
          x.fillStyle = "#f7fbff";
          x.font = "900 16px Space Grotesk, sans-serif";
          x.textAlign = "center";
          x.fillText(txt, 64, 38);
          const m = new THREE.Mesh(
            new THREE.PlaneGeometry(0.65, 0.32),
            new THREE.MeshBasicMaterial({
              map: new THREE.CanvasTexture(cc),
              transparent: true,
              side: THREE.DoubleSide,
            }),
          );
          m.userData = { a: (i * Math.PI * 2) / arr.length, r: 2.3, sp: 0.004 + i * 0.0005 };
          group.add(m);
        });
        fitRenderer(r, c, cam);
        addEventListener("resize", () => fitRenderer(r, c, cam));
        let mx = 0,
          my = 0;
        addEventListener("mousemove", (e) => {
          mx = e.clientX / innerWidth - 0.5;
          my = e.clientY / innerHeight - 0.5;
        });
        let fitDone = false;
        function loop(t) {
          requestAnimationFrame(loop);
          if (!fitDone) {
            fitRenderer(r, c, cam);
            if (c.getBoundingClientRect().height > 0) fitDone = true;
          }
          const time = t / 1000;
          mat.uniforms.uTime.value = time;
          group.rotation.y += (mx * 0.6 - group.rotation.y) * 0.035;
          group.rotation.x += (-my * 0.25 - group.rotation.x) * 0.035;
          wire.rotation.y += 0.004;
          group.children.forEach((o) => {
            if (o.userData.r) {
              o.userData.a += o.userData.sp;
              o.position.set(
                Math.cos(o.userData.a) * o.userData.r,
                Math.sin(o.userData.a * 0.7) * 0.8,
                Math.sin(o.userData.a) * 0.7,
              );
              o.quaternion.copy(cam.quaternion);
            }
          });
          r.render(s, cam);
        }
        loop(0);
      }
      function initSkillsScene() {
        const c = $("#skills-canvas"),
          r = new THREE.WebGLRenderer({
            canvas: c,
            alpha: true,
            antialias: true,
          }),
          s = new THREE.Scene(),
          cam = new THREE.PerspectiveCamera(45, 1, 0.1, 70);
        cam.position.z = 5.0;
        s.add(new THREE.AmbientLight(0xffffff, 0.42));
        s.add(new THREE.PointLight(0x00ffb2, 2, 12));
        const group = new THREE.Group();
        s.add(group);
        const center = new THREE.Mesh(
          new THREE.TorusKnotGeometry(0.6, 0.12, 96, 18),
          new THREE.MeshPhysicalMaterial({
            color: 0x00ffb2,
            emissive: 0x00ffb2,
            emissiveIntensity: 0.35,
            roughness: 0.1,
            metalness: 0.8,
          }),
        );
        group.add(center);
        ["React", "Python", "Node", "AI", "Docker", "Git"].forEach(
          (name, i) => {
            const cc = document.createElement("canvas");
            cc.width = 160;
            cc.height = 80;
            const x = cc.getContext("2d");
            x.fillStyle = "rgba(5,7,11,.88)";
            x.fillRect(0, 0, 160, 80);
            x.fillStyle = i % 2 ? "#4cc9ff" : "#00ffb2";
            x.font = "900 24px Space Grotesk, sans-serif";
            x.textAlign = "center";
            x.fillText(name, 80, 48);
            const m = new THREE.Mesh(
              new THREE.PlaneGeometry(0.8, 0.4),
              new THREE.MeshBasicMaterial({
                map: new THREE.CanvasTexture(cc),
                transparent: true,
                side: THREE.DoubleSide,
              }),
            );
            m.userData = {
              a: (i * Math.PI * 2) / 6,
              r: 1.0 + (i % 3) * 0.2,
              sp: 0.007 + i * 0.0007,
            };
            group.add(m);
          },
        );
        cam.lookAt(0, 0, 0);
        fitRenderer(r, c, cam);
        addEventListener("resize", () => fitRenderer(r, c, cam));
        let fitDone = false;
        function loop() {
          requestAnimationFrame(loop);
          if (!fitDone) {
            fitRenderer(r, c, cam);
            if (c.getBoundingClientRect().height > 0) fitDone = true;
          }
          center.rotation.x += 0.01;
          center.rotation.y += 0.013;
          group.rotation.y += 0.002;
          group.children.forEach((o) => {
            if (o.userData.r) {
              o.userData.a += o.userData.sp;
              o.position.set(
                Math.cos(o.userData.a) * o.userData.r,
                Math.sin(o.userData.a * 0.8),
                Math.sin(o.userData.a) * 1.05,
              );
              o.quaternion.copy(cam.quaternion);
            }
          });
          r.render(s, cam);
        }
        loop();
      }
      function initRain() {
        const c = $("#rain-canvas"),
          ctx = c.getContext("2d"),
          chars =
            "01{}();=> const let async await fetch git npm docker AI API React Node Python".split(
              " ",
            );
        function size() {
          c.width = c.offsetWidth * devicePixelRatio;
          c.height = c.offsetHeight * devicePixelRatio;
          ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        }
        size();
        addEventListener("resize", size);
        let cols = [],
          w = 18;
        function draw() {
          ctx.fillStyle = "rgba(5,7,11,.18)";
          ctx.fillRect(0, 0, c.offsetWidth, c.offsetHeight);
          ctx.font = "14px monospace";
          const n = Math.ceil(c.offsetWidth / w);
          while (cols.length < n) cols.push(Math.random() * c.offsetHeight);
          cols.forEach((y, i) => {
            ctx.fillStyle =
              Math.random() > 0.15
                ? "rgba(0,255,178,.75)"
                : "rgba(76,201,255,.7)";
            ctx.fillText(
              chars[Math.floor(Math.random() * chars.length)],
              i * w,
              y,
            );
            cols[i] = y + 16;
            if (cols[i] > c.offsetHeight + 30 && Math.random() > 0.94)
              cols[i] = 0;
          });
          requestAnimationFrame(draw);
        }
        draw();
      }
      function initUI() {
        const sp = $("#sp"),
          nav = $("#navbar");
        addEventListener("scroll", () => {
          const max = document.documentElement.scrollHeight - innerHeight;
          sp.style.width = (scrollY / max) * 100 + "%";
          nav.classList.toggle("scrolled", scrollY > 50);
          $$("[data-sec]").forEach((a) => {
            const s = $("#" + a.dataset.sec);
            if (!s) return;
            const r = s.getBoundingClientRect();
            a.classList.toggle("active", r.top < 150 && r.bottom > 150);
          });
        });
        const io = new IntersectionObserver(
          (es) =>
            es.forEach((e) => {
              if (e.isIntersecting) {
                gsap.to(e.target, {
                  opacity: 1,
                  y: 0,
                  duration: 0.8,
                  ease: "power3.out",
                });
                io.unobserve(e.target);
              }
            }),
          { threshold: 0.13 },
        );
        $$(".reveal").forEach((el) => io.observe(el));
        let idx = 0;
        const slides = $("#cslides"),
          dots = $$(".cdot");
        function go(n) {
          idx = (n + 3) % 3;
          slides.style.transform = "translateX(-" + idx * 100 + "%)";
          dots.forEach((d, i) => d.classList.toggle("on", i === idx));
        }
        $("#cprev").onclick = () => go(idx - 1);
        $("#cnext").onclick = () => go(idx + 1);
        dots.forEach((d) => (d.onclick = () => go(+d.dataset.i)));
        window.toggleAcc = (id) => {
          const el = $("#" + id),
            was = el.classList.contains("open");
          $$(".acc-row").forEach((r) => r.classList.remove("open"));
          if (!was) el.classList.add("open");
        };
        window.openCertModal = (src) => {
          const modal = $("#cert-modal");
          const img = $("#modal-img");
          img.src = src;
          modal.classList.add("active");
        };
        window.closeCertModal = () => {
          const modal = $("#cert-modal");
          modal.classList.remove("active");
        };
        $$(".skill-card").forEach((card) => {
          card.addEventListener("mousemove", (e) => {
            const r = card.getBoundingClientRect(),
              x = e.clientX - r.left,
              y = e.clientY - r.top;
            card.style.transform =
              "perspective(900px) rotateX(" +
              -(y / r.height - 0.5) * 5 +
              "deg) rotateY(" +
              (x / r.width - 0.5) * 7 +
              "deg)";
          });
          card.addEventListener(
            "mouseleave",
            () => (card.style.transform = ""),
          );
        });
      }
      function initTypewriter() {
        const el = $("#typed-text"),
          phrases = [
            "a Full Stack Developer",
            "an AI & ML Engineer",
            "an App Builder",
            "a Problem Solver",
          ];
        let pi = 0,
          ci = 0,
          del = false;
        function tick() {
          const t = phrases[pi];
          if (!del) {
            el.textContent = t.slice(0, ++ci);
            if (ci >= t.length) {
              del = true;
              return setTimeout(tick, 1450);
            }
          } else {
            el.textContent = t.slice(0, --ci);
            if (ci <= 0) {
              del = false;
              pi = (pi + 1) % phrases.length;
            }
          }
          setTimeout(tick, del ? 22 : 46);
        }
        tick();
      }
      function startIntro() {
        gsap.to(".hero-greeting", { opacity: 1, y: 0, duration: 0.7 });
        gsap.to(".hero-name", {
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay: 0.1,
          ease: "power3.out",
        });
        gsap.to(".hero-tw", { opacity: 1, y: 0, duration: 0.7, delay: 0.28 });
        gsap.to(".hero-actions", {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: 0.42,
        });
        initTypewriter();
      }
      initLoader();
      initBg();
      initOrb();
      initSkillsScene();
      initRain();
      initUI();
