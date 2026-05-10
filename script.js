      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const $ = (s) => document.querySelector(s),
        $$ = (s) => Array.from(document.querySelectorAll(s));
      const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const perfProfile = (() => {
        const memory = navigator.deviceMemory || 8;
        const cores = navigator.hardwareConcurrency || 8;
        const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
        return {
          constrained:
            prefersReduced ||
            memory <= 4 ||
            cores <= 4 ||
            (coarsePointer && (window.devicePixelRatio || 1) > 2),
        };
      })();
      const rendererBase = (antialias) => ({
        alpha: true,
        antialias,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: perfProfile.constrained ? "low-power" : "high-performance",
      });
      const maxDpr = (cap = 1.6) =>
        Math.min(window.devicePixelRatio || 1, perfProfile.constrained ? Math.min(cap, 1.25) : cap);
      const passive = { passive: true };
      function rafThrottle(fn) {
        let frame = 0;
        let lastArgs;
        return (...args) => {
          lastArgs = args;
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            fn(...lastArgs);
          });
        };
      }
      function createRafLoop(step, { pauseWhenHidden = true } = {}) {
        let frame = 0;
        let active = true;
        const canRun = () => active && (!pauseWhenHidden || !document.hidden);
        const tick = (t) => {
          frame = 0;
          if (!canRun()) return;
          step(t);
          if (canRun()) frame = requestAnimationFrame(tick);
        };
        const start = () => {
          if (!frame && canRun()) frame = requestAnimationFrame(tick);
        };
        const stop = () => {
          if (frame) cancelAnimationFrame(frame);
          frame = 0;
        };
        const onVis = () => (document.hidden ? stop() : start());
        if (pauseWhenHidden) document.addEventListener("visibilitychange", onVis, passive);
        return {
          start,
          stop,
          setActive(value) {
            active = value;
            value ? start() : stop();
          },
          destroy() {
            active = false;
            stop();
            if (pauseWhenHidden) document.removeEventListener("visibilitychange", onVis);
          },
        };
      }
      function nearViewport(el, margin = 320) {
        const r = el.getBoundingClientRect();
        return r.bottom >= -margin && r.top <= innerHeight + margin && r.right >= -margin && r.left <= innerWidth + margin;
      }
      function watchVisibility(el, onChange, rootMargin = "320px") {
        if (!("IntersectionObserver" in window)) {
          onChange(true);
          return () => {};
        }
        let inView = nearViewport(el, parseInt(rootMargin, 10) || 320);
        const update = () => onChange(inView && !document.hidden);
        const io = new IntersectionObserver(
          ([entry]) => {
            inView = entry.isIntersecting;
            update();
          },
          { rootMargin },
        );
        io.observe(el);
        document.addEventListener("visibilitychange", update, passive);
        update();
        return () => {
          io.disconnect();
          document.removeEventListener("visibilitychange", update);
        };
      }
      function onCanvasResize(c, cb) {
        const run = rafThrottle(cb);
        if ("ResizeObserver" in window) {
          const ro = new ResizeObserver(run);
          ro.observe(c);
          addEventListener("resize", run, passive);
          return () => {
            ro.disconnect();
            removeEventListener("resize", run);
          };
        }
        addEventListener("resize", run, passive);
        return () => removeEventListener("resize", run);
      }
      function disposeScene(scene) {
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
          mats.forEach((mat) => {
            Object.keys(mat).forEach((key) => {
              const value = mat[key];
              if (value && value.isTexture) value.dispose();
            });
            if (mat.dispose) mat.dispose();
          });
        });
      }
      function fitRenderer(r, c, cam, dprCap = 1.6) {
        const b = c.getBoundingClientRect(),
          w = Math.max(1, Math.floor(b.width)),
          h = Math.max(1, Math.floor(b.height)),
          dpr = maxDpr(dprCap),
          prev = r.__fitState || {};
        if (prev.w === w && prev.h === h && prev.dpr === dpr) return;
        r.setPixelRatio(dpr);
        r.setSize(w, h, false);
        r.__fitState = { w, h, dpr };
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
        const c = $("#loader-canvas");
        if (!c) return;
        const r = new THREE.WebGLRenderer({ canvas: c, ...rendererBase(true) });
        const s = new THREE.Scene();
        const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 120);
        cam.position.z = 7;

        // Lighting
        s.add(new THREE.AmbientLight(0x0a0a1a, 1.2));
        const lGreen = new THREE.PointLight(0x00ffb2, 4, 14);
        lGreen.position.set(2, 2, 4);
        s.add(lGreen);
        const lPurple = new THREE.PointLight(0x8f5cff, 3, 14);
        lPurple.position.set(-3, -1, 3);
        s.add(lPurple);
        const lCyan = new THREE.PointLight(0x4cc9ff, 2, 12);
        lCyan.position.set(0, 3, -2);
        s.add(lCyan);

        // Central AI core group
        const atom = new THREE.Group();
        s.add(atom);

        // Core liquid sphere
        const coreMat = liquidMat();
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.58, 80, 80), coreMat);
        atom.add(core);

        // Glass shell
        atom.add(new THREE.Mesh(
          new THREE.SphereGeometry(0.65, 48, 48),
          new THREE.MeshPhysicalMaterial({
            color: 0xffffff, roughness: 0.0, metalness: 0.05,
            transmission: 0.88, transparent: true, opacity: 0.18,
          })
        ));

        // Orbital rings - 5 rings at varied angles
        const ringDefs = [
          { rx: 0,              ry: 0,    color: 0x00ffb2, op: 0.9, r: 1.7,  tube: 0.009, sp: 0.010 },
          { rx: Math.PI/3,     ry: 0.3,  color: 0x4cc9ff, op: 0.8, r: 1.9,  tube: 0.007, sp: 0.007 },
          { rx: -Math.PI/3,    ry: -0.5, color: 0x8f5cff, op: 0.7, r: 2.1,  tube: 0.007, sp: -0.009 },
          { rx: Math.PI/2,     ry: 0.8,  color: 0x00ffb2, op: 0.4, r: 2.4,  tube: 0.005, sp: 0.005 },
          { rx: -Math.PI/6,    ry: 1.2,  color: 0x4cc9ff, op: 0.35,r: 2.65, tube: 0.004, sp: -0.006 },
        ];
        const rings = ringDefs.map(d => {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(d.r, d.tube, 16, 200),
            new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: d.op })
          );
          ring.rotation.set(d.rx, d.ry, 0);
          ring.userData = { sp: d.sp, radius: d.r };
          atom.add(ring);
          return ring;
        });

        // Orbiting electron dots
        const electrons = rings.slice(0, 3).map((ring, i) => {
          const e = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
          );
          e.userData = { ring, angle: i * 2.1, speed: 0.025 + i * 0.008, pos: new THREE.Vector3() };
          s.add(e);
          return e;
        });

        // Floating depth particles
        const PARTICLES = 280;
        const pPos = new Float32Array(PARTICLES * 3);
        const pSizes = new Float32Array(PARTICLES);
        for (let i = 0; i < PARTICLES; i++) {
          pPos[i*3]   = (Math.random()-0.5) * 18;
          pPos[i*3+1] = (Math.random()-0.5) * 12;
          pPos[i*3+2] = (Math.random()-0.5) * 14;
          pSizes[i] = Math.random() * 2.5 + 0.5;
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
        pGeo.setAttribute("size", new THREE.BufferAttribute(pSizes, 1));
        const pMat = new THREE.PointsMaterial({
          size: 0.04, color: 0x4cc9ff, transparent: true, opacity: 0.5,
          sizeAttenuation: true,
        });
        s.add(new THREE.Points(pGeo, pMat));

        fitRenderer(r, c, cam, 1.8);
        const cleanupResize = onCanvasResize(c, () => fitRenderer(r, c, cam, 1.8));

        // AI status messages
        const statusEl = $("#ldr-status");
        const messages = [
          "Initializing Neural Interface",
          "Loading Interactive Systems",
          "Preparing Experience",
          "Synchronizing Portfolio",
          "Entering Workspace",
        ];
        let msgIdx = 0;
        function cycleMsg() {
          if (!statusEl) return;
          statusEl.classList.add("fading");
          setTimeout(() => {
            msgIdx = (msgIdx + 1) % messages.length;
            statusEl.textContent = messages[msgIdx];
            statusEl.classList.remove("fading");
          }, 320);
        }
        const msgTimer = setInterval(cycleMsg, 2200);

        // Live HUD data animation
        const hudVals = $$(".ldr-hud-val");
        function rndHud() {
          const vals = [
            Math.floor(Math.random()*60+20)+"%",
            Math.floor(Math.random()*40+30)+"%",
            Math.floor(Math.random()*80+10)+"%",
            Math.floor(Math.random()*40+10)+"ms",
            Math.floor(Math.random()*40+30)+"ms",
            Math.floor(Math.random()*30+50)+"fps",
            Math.floor(Math.random()*200+100)+"mb",
          ];
          hudVals.forEach((el, i) => { if (vals[i] !== undefined) el.textContent = vals[i]; });
        }
        rndHud();
        const hudTimer = setInterval(rndHud, 800);

        // Mouse parallax
        let mx = 0, my = 0, targetMx = 0, targetMy = 0;
        const onMouseMove = (e) => {
          targetMx = (e.clientX / innerWidth - 0.5) * 2;
          targetMy = (e.clientY / innerHeight - 0.5) * 2;
        };
        if (finePointer) document.addEventListener("mousemove", onMouseMove, passive);

        let p = 0, done = false;
        const start = performance.now();
        const pctEl = $("#loader-pct"), barEl = $("#loader-bar");
        let loaderLoop;
        loaderLoop = createRafLoop((t) => {
          if (done) return;
          const time = (t - start) / 1000;

          // Smooth mouse parallax on camera
          mx += (targetMx - mx) * 0.04;
          my += (targetMy - my) * 0.04;
          cam.position.x = mx * 0.5;
          cam.position.y = -my * 0.3;
          cam.lookAt(0, 0, 0);

          // Core animation
          coreMat.uniforms.uTime.value = time;
          atom.rotation.y += 0.006;
          atom.rotation.x = Math.sin(time * 0.7) * 0.1;
          atom.position.y = Math.sin(time * 0.9) * 0.06;

          // Individual ring rotations
          rings.forEach(ring => {
            ring.rotation.z += ring.userData.sp;
            ring.rotation.x += ring.userData.sp * 0.3;
          });

          // Electron orbits
          electrons.forEach(e => {
            e.userData.angle += e.userData.speed;
            const pos = e.userData.pos.set(
              Math.cos(e.userData.angle) * e.userData.ring.userData.radius,
              Math.sin(e.userData.angle) * e.userData.ring.userData.radius,
              0
            );
            e.userData.ring.localToWorld(pos);
            e.position.copy(pos);
          });

          // Particle slow drift
          const pArr = pGeo.attributes.position.array;
          for (let i = 1; i < PARTICLES * 3; i += 3) {
            pArr[i] += 0.003;
            if (pArr[i] > 6) pArr[i] = -6;
          }
          pGeo.attributes.position.needsUpdate = true;

          // Point light pulse
          lGreen.intensity = 3 + Math.sin(time * 2.3) * 1.2;
          lPurple.intensity = 2.5 + Math.sin(time * 1.7 + 1) * 1;

          // Progress
          p = Math.min(100, p + (prefersReduced ? 6 : 0.55 + Math.random() * 1.1));
          if (pctEl) pctEl.textContent = Math.floor(p) + "%";
          if (barEl) barEl.style.width = p + "%";

          if (p >= 100 && !done) {
            done = true;
            loaderLoop.setActive(false);
            clearInterval(msgTimer);
            clearInterval(hudTimer);
            if (statusEl) { statusEl.classList.add("fading"); }
            setTimeout(() => {
              // Cinematic exit: blur + scale zoom + fade
              const loader = $("#loader");
              if (loader) {
                loader.style.transition = "opacity 0.9s ease, filter 0.9s ease, transform 0.9s ease";
                loader.style.filter = "blur(12px)";
                loader.style.transform = "scale(1.06)";
                loader.style.opacity = "0";
              }
              setTimeout(() => {
                document.body.classList.remove("locked");
                if (loader) loader.style.display = "none";
                cleanupResize();
                if (finePointer) document.removeEventListener("mousemove", onMouseMove);
                loaderLoop.destroy();
                disposeScene(s);
                r.dispose();
                startIntro();
              }, 950);
            }, 400);
          }
          r.render(s, cam);
        }, { pauseWhenHidden: false });
        loaderLoop.start();
      }

      function initBg() {
        const c = $("#bg-canvas"),
          r = new THREE.WebGLRenderer({
            canvas: c,
            ...rendererBase(false),
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
        onCanvasResize(c, () => fitRenderer(r, c, cam));
        const bgLoop = createRafLoop(() => {
          for (let i = 0; i < n; i++) {
            pos[i * 3 + 1] += vel[i];
            if (pos[i * 3 + 1] > 15) pos[i * 3 + 1] = -15;
          }
          g.attributes.position.needsUpdate = true;
          s.rotation.y = scrollY * 0.00008;
          r.render(s, cam);
        });
        bgLoop.start();
      }
      function initOrb() {
        const c = $("#orb-canvas"),
          r = new THREE.WebGLRenderer({
            canvas: c,
            ...rendererBase(true),
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
        onCanvasResize(c, () => fitRenderer(r, c, cam));
        let mx = 0,
          my = 0;
        if (finePointer) addEventListener("mousemove", (e) => {
          mx = e.clientX / innerWidth - 0.5;
          my = e.clientY / innerHeight - 0.5;
        }, passive);
        let fitDone = false;
        const orbLoop = createRafLoop((t) => {
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
        });
        watchVisibility(c, (active) => orbLoop.setActive(active), "520px");
        orbLoop.start();
      }
      function initSkillsScene() {
        const c = $("#skills-canvas"),
          r = new THREE.WebGLRenderer({
            canvas: c,
            ...rendererBase(true),
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
        onCanvasResize(c, () => fitRenderer(r, c, cam));
        let fitDone = false;
        const skillsLoop = createRafLoop(() => {
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
        });
        watchVisibility(c, (active) => skillsLoop.setActive(active), "520px");
        skillsLoop.start();
      }
      function initRain() {
        const c = $("#rain-canvas"),
          ctx = c.getContext("2d", { alpha: true }),
          chars =
            "01{}();=> const let async await fetch git npm docker AI API React Node Python".split(
              " ",
            );
        let cols = [],
          w = 18,
          drawW = 0,
          drawH = 0,
          rainDpr = 1;
        function size() {
          const nextDpr = maxDpr(1.6);
          const nextW = Math.max(1, Math.floor(c.offsetWidth * nextDpr));
          const nextH = Math.max(1, Math.floor(c.offsetHeight * nextDpr));
          if (drawW === nextW && drawH === nextH && rainDpr === nextDpr) return;
          drawW = nextW;
          drawH = nextH;
          rainDpr = nextDpr;
          c.width = drawW;
          c.height = drawH;
          ctx.setTransform(rainDpr, 0, 0, rainDpr, 0, 0);
          ctx.font = "14px monospace";
          cols = [];
        }
        size();
        onCanvasResize(c, size);
        const rainLoop = createRafLoop(() => {
          ctx.fillStyle = "rgba(5,7,11,.18)";
          ctx.fillRect(0, 0, c.offsetWidth, c.offsetHeight);
          const n = Math.ceil(c.offsetWidth / w);
          while (cols.length < n) cols.push(Math.random() * c.offsetHeight);
          if (cols.length > n) cols.length = n;
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
        });
        watchVisibility(c, (active) => rainLoop.setActive(active), "420px");
        rainLoop.start();
      }
      function initUI() {
        const sp = $("#sp"),
          nav = $("#navbar");
        const navTargets = $$("[data-sec]").map((a) => ({
          a,
          section: $("#" + a.dataset.sec),
        }));
        let scrollFrame = 0;
        const updateScroll = () => {
          scrollFrame = 0;
          const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
          sp.style.transform = "scaleX(" + Math.min(1, scrollY / max) + ")";
          nav.classList.toggle("scrolled", scrollY > 50);
          navTargets.forEach(({ a, section }) => {
            if (!section) return;
            const r = section.getBoundingClientRect();
            a.classList.toggle("active", r.top < 150 && r.bottom > 150);
          });
        };
        addEventListener("scroll", () => {
          if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
        }, passive);
        updateScroll();

        // Upgraded reveal observer
        const revealEls = [".reveal", ".sec-eyebrow", ".sec-heading", ".journey", ".about-text-col"];
        const io = new IntersectionObserver(
          (es) =>
            es.forEach((e) => {
              if (e.isIntersecting) {
                gsap.to(e.target, {
                  opacity: 1,
                  y: 0,
                  x: 0,
                  duration: 0.85,
                  ease: "power3.out",
                });
                io.unobserve(e.target);
              }
            }),
          { threshold: 0.1 },
        );
        revealEls.forEach(sel => $$(sel).forEach((el) => io.observe(el)));

        // Animated counters
        const counterObs = new IntersectionObserver((es) =>
          es.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target;
            const target = parseFloat(el.dataset.target);
            const isDecimal = el.dataset.decimal === "1";
            const duration = 1800;
            const start = performance.now();
            function update(now) {
              const t = Math.min((now - start) / duration, 1);
              const val = t * target;
              el.textContent = isDecimal ? val.toFixed(1) : Math.floor(val);
              if (t < 1) requestAnimationFrame(update);
              else el.textContent = isDecimal ? target.toFixed(1) : target;
            }
            requestAnimationFrame(update);
            counterObs.unobserve(el);
          }), { threshold: 0.5 }
        );
        $$(".counter").forEach(el => counterObs.observe(el));

        // Carousel
        let idx = 0;
        const slides = $("#cslides"),
          dots = $$(".cdot"),
          projectItems = $$(".proj-nav-item");
        function go(n) {
          idx = (n + dots.length) % dots.length;
          if (slides) slides.style.transform = "translateX(-" + idx * 100 + "%)";
          dots.forEach((d, i) => d.classList.toggle("on", i === idx));
          // Sync project nav
          projectItems.forEach((item, i) => {
            item.classList.toggle("active", i === idx);
          });
        }
        const prevBtn = $("#cprev"), nextBtn = $("#cnext");
        if (prevBtn) prevBtn.onclick = () => go(idx - 1);
        if (nextBtn) nextBtn.onclick = () => go(idx + 1);
        dots.forEach((d) => (d.onclick = () => go(+d.dataset.i)));

        // Project nav click
        projectItems.forEach((item) => {
          item.addEventListener("click", () => {
            go(+item.dataset.proj);
          });
        });

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
        if (finePointer) $$(".skill-card").forEach((card) => {
          const tilt = rafThrottle((clientX, clientY) => {
            const r = card.getBoundingClientRect(),
              x = clientX - r.left,
              y = clientY - r.top;
            card.style.transform =
              "perspective(900px) rotateX(" +
              -(y / r.height - 0.5) * 5 +
              "deg) rotateY(" +
              (x / r.width - 0.5) * 7 +
              "deg)";
          });
          card.addEventListener("mousemove", (e) => tilt(e.clientX, e.clientY), passive);
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
        if (!el) return;
        function tick() {
          if (document.hidden) {
            setTimeout(tick, 250);
            return;
          }
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
        // Staggered reveal sequence
        const tl = [
          { sel: ".hero-eyebrow", delay: 0 },
          { sel: ".hero-name", delay: 0.15 },
          { sel: ".hero-descriptor", delay: 0.3 },
          { sel: ".hero-bio", delay: 0.42 },
          { sel: ".hero-actions", delay: 0.54 },
          { sel: ".tech-badges", delay: 0.66 },
          { sel: ".hero-stage", delay: 0.2, x: false },
          { sel: ".scroll-hint", delay: 1.2 },
        ];
        tl.forEach(({ sel, delay, x }) => {
          const el = $(sel);
          if (!el) return;
          if (x === false) {
            gsap.to(el, { opacity: 1, x: 0, duration: 1, delay, ease: "power3.out" });
          } else {
            gsap.to(el, { opacity: 1, y: 0, duration: 0.85, delay, ease: "power3.out" });
          }
        });
        initTypewriter();
        initHeroInteractions();
      }

      function initHeroInteractions() {
        const glow = $("#cursor-glow");
        const card = $("#holo-card");

        // Cursor glow tracking
        if (glow && finePointer) {
          const moveGlow = rafThrottle((x, y) => {
            glow.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
          });
          document.addEventListener("mousemove", (e) => moveGlow(e.clientX, e.clientY), passive);
        }

        // 3D tilt on holographic card
        if (card && finePointer) {
          const tiltCard = rafThrottle((clientX, clientY) => {
            const r = card.getBoundingClientRect();
            const x = (clientX - r.left) / r.width - 0.5;
            const y = (clientY - r.top) / r.height - 0.5;
            card.style.transform = `perspective(1000px) rotateY(${x * 12}deg) rotateX(${-y * 8}deg) scale(1.02) translateZ(0)`;
          });
          card.addEventListener("mousemove", (e) => tiltCard(e.clientX, e.clientY), passive);
          card.addEventListener("mouseleave", () => {
            card.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1) translateZ(0)";
          });
        }

        // Magnetic button effect
        if (finePointer) $$(".magnetic").forEach((btn) => {
          const moveBtn = rafThrottle((clientX, clientY) => {
            const r = btn.getBoundingClientRect();
            const x = clientX - r.left - r.width / 2;
            const y = clientY - r.top - r.height / 2;
            btn.style.transform = `translate3d(${x * 0.2}px, ${y * 0.2}px, 0)`;
          });
          btn.addEventListener("mousemove", (e) => moveBtn(e.clientX, e.clientY), passive);
          btn.addEventListener("mouseleave", () => {
            btn.style.transform = "translate3d(0, 0, 0)";
          });
        });

        // Parallax on hero left content
        const heroLeft = $("#hero-left");
        if (heroLeft && finePointer && !prefersReduced) {
          const moveHero = rafThrottle((clientX, clientY) => {
            const x = (clientX / innerWidth - 0.5) * 12;
            const y = (clientY / innerHeight - 0.5) * 6;
            heroLeft.style.transform = `translate3d(${x * 0.3}px, ${y * 0.3}px, 0)`;
          });
          document.addEventListener("mousemove", (e) => moveHero(e.clientX, e.clientY), passive);
        }
      }

      initLoader();
      initBg();
      initOrb();
      initSkillsScene();
      initRain();
      initUI();
