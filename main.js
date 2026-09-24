(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  if (reduced || !hasGsap) document.documentElement.classList.add("reduced");

  /* ---------- Render projects ---------- */
  const track = $("#projectsTrack");
  PROJECTS.forEach((p, i) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "pcard";
    card.dataset.open = p.id;
    card.dataset.cursor = "view";
    card.innerHTML = `
      <div class="pcard__media">
        <img src="${p.cover}" alt="${p.name}, ${p.location}" loading="lazy" width="1536" height="1152">
        <div class="pcard__tag"><span>${p.stage}</span><span>${p.type}</span></div>
        <span class="pcard__num" aria-hidden="true">0${i + 1}</span>
      </div>
      <div class="pcard__body">
        <div><h3>${p.name}</h3><p class="loc">${p.location}</p></div>
        <div class="pcard__price"><small>${/^\d/.test(p.price) ? "À partir de" : "Prix"}</small><strong>${p.price}</strong></div>
      </div>`;
    track.appendChild(card);
  });
  const end = document.createElement("div");
  end.className = "pcard pcard--end";
  end.innerHTML = `<span class="eyebrow" style="color:var(--ink)">Et bien plus</span>
    <h3>Tulum, Algarve, Dubaï, Las Terrenas…</h3>
    <p style="margin:0;font-weight:500">Mathieu a accès à l'ensemble des projets du réseau Sunset. Dites-lui ce que vous cherchez.</p>
    <a class="btn btn--dark" href="https://calendly.com/mlarochelle-sunsetrealestate" target="_blank" rel="noopener">Recevoir une sélection <span class="arrow" aria-hidden="true">→</span></a>`;
  track.appendChild(end);

  /* ---------- Render destinations ---------- */
  const list = $("#destList");
  const float = $("#destFloat");
  DESTINATIONS.forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "drow";
    row.dataset.i = i;
    row.innerHTML = `<span class="drow__n">0${i + 1}</span>
      <span class="drow__name">${d.name}${d.accent ? ` <span class="serif">${d.accent}</span>` : ""}</span>
      <span class="drow__meta">${d.meta}</span>
      <img class="drow__thumb" src="${d.img}" alt="" loading="lazy" width="168" height="168">`;
    list.appendChild(row);
    const img = document.createElement("img");
    img.src = d.img; img.alt = ""; img.loading = "lazy";
    float.appendChild(img);
  });

  /* ---------- Modal ---------- */
  const modal = $("#modal");
  const modalContent = $("#modalContent");
  let lastFocus = null;
  const openModal = (id) => {
    const p = PROJECTS.find((x) => x.id === id);
    if (!p) return;
    lastFocus = document.activeElement;
    modalContent.innerHTML = `
      <div class="modal__hero"><img src="${p.gallery[0]}" alt="${p.name}">
        <div class="modal__title"><span class="eyebrow" style="color:#fff">${p.stage} · ${p.type}</span><h3 id="modalTitle">${p.name}</h3></div>
      </div>
      <div class="modal__body">
        <div>
          <p style="margin-top:0;font-size:1.2rem;line-height:1.5;font-weight:500;color:var(--ink)">${p.pitch}</p>
          <div class="modal__facts">
            <div><small>${/^\d/.test(p.price) ? "Prix de départ" : "Prix"}</small><strong>${p.price}</strong></div>
            <div><small>Type</small><strong>${p.type}</strong></div>
            <div><small>Emplacement</small><strong>${p.location.split(" · ")[0]}</strong></div>
            <div><small>Statut</small><strong>${p.stage}</strong></div>
          </div>
          <p style="font-size:.78rem;color:var(--muted)">Prix et disponibilités sujets à changement; Mathieu confirme les unités à jour avant toute réservation.</p>
          <div style="display:flex;flex-wrap:wrap;gap:.7rem;margin-top:1.4rem">
            <a class="btn btn--sun" href="https://calendly.com/mlarochelle-sunsetrealestate" target="_blank" rel="noopener">Réserver une visite <span class="arrow" aria-hidden="true">→</span></a>
            <a class="btn btn--dark" href="mailto:mlarochelle@sunsetrealestate.ca?subject=${encodeURIComponent("Fiche " + p.name)}">Recevoir la brochure</a>
          </div>
        </div>
        <div class="modal__gallery">${p.gallery.map((g, i) => `<img src="${g}" alt="${p.name}, image ${i + 1}" loading="lazy">`).join("")}</div>
      </div>`;
    modal.classList.add("is-open");
    lenis?.stop();
    if (hasGsap && !reduced) {
      gsap.fromTo(".modal__panel", { yPercent: 12, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .8, ease: "expo.out" });
      gsap.fromTo(".modal__back", { opacity: 0 }, { opacity: 1, duration: .4 });
      gsap.fromTo(".modal__gallery img", { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: .07, duration: .8, delay: .2, ease: "expo.out" });
    }
    $(".modal__close").focus();
  };
  const closeModal = () => {
    modal.classList.remove("is-open");
    lenis?.start();
    lastFocus?.focus();
  };
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) openModal(opener.dataset.open);
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "Tab") {
      const f = $$("a, button", modal);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Contact form -> WhatsApp ---------- */
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const nom = (f.get("nom") || "").toString().trim();
    if (!nom) { e.target.nom.focus(); return; }
    const text = `Bonjour Mathieu, c'est ${nom}.\n${f.get("message") || "J'aimerais en savoir plus sur vos projets."}\nDestination : ${f.get("destination")}${f.get("tel") ? `\nTéléphone : ${f.get("tel")}` : ""}`;
    $("#formWa").href = `https://wa.me/14188091413?text=${encodeURIComponent(text)}`;
    $("#formReady").hidden = false;
    $("#formWa").focus();
  });

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger");
  const menu = $("#menu");
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    document.body.classList.toggle("menu-open", open);
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add("is-open")); lenis?.stop(); }
    else { menu.classList.remove("is-open"); setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 700); lenis?.start(); }
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false); });

  /* ---------- Mobile carousel counter ---------- */
  const projCount = $("#projectsCount");
  track.addEventListener("scroll", () => {
    const cards = $$(".pcard", track);
    const w = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
    const i = Math.min(cards.length, Math.round(track.scrollLeft / w) + 1);
    projCount.textContent = `${String(i).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
  }, { passive: true });
  projCount.textContent = `01 / ${String($$(".pcard", track).length).padStart(2, "0")}`;

  /* ---------- Manifesto words ---------- */
  const man = $("#manifesto");
  man.innerHTML = man.textContent.split(" ").map((w) => `<span class="w">${w}</span>`).join(" ");

  /* ---------- Nav state ---------- */
  const nav = $("#nav");
  const dock = $("#dock");
  let lastY = 0;
  const onScroll = (y) => {
    nav.classList.toggle("is-solid", y > innerHeight * 0.6);
    nav.classList.toggle("is-hidden", y > lastY && y > innerHeight && !modal.classList.contains("is-open") && !document.body.classList.contains("menu-open"));
    dock.classList.toggle("is-on", y > innerHeight * 0.8 && y < document.documentElement.scrollHeight - innerHeight * 1.6);
    lastY = y;
  };

  /* ---------- Reduced / no-GSAP path ---------- */
  let lenis = null;
  if (reduced || !hasGsap) {
    $("#loader").remove();
    $("#cursor").remove();
    if (reduced) { const v = $("#heroVideo"); v.removeAttribute("autoplay"); v.pause(); }
    document.body.classList.remove("is-loading");
    $$("[data-count]").forEach((el) => (el.textContent = Number(el.dataset.count).toLocaleString("fr-CA")));
    $$(".step").forEach((s) => s.classList.add("is-on"));
    addEventListener("scroll", () => onScroll(scrollY), { passive: true });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const unlock = () => {
    const l = $("#loader");
    if (l) l.remove();
    document.body.classList.remove("is-loading");
    lenis?.start();
  };
  const bailOut = () => {
    try { ScrollTrigger.getAll().forEach((t) => t.kill()); gsap.globalTimeline.clear(); } catch (_) { /* ignore */ }
    $$("[style]").forEach((el) => { if (!el.closest("#modal")) { el.style.opacity = ""; el.style.transform = ""; el.style.clipPath = ""; el.style.translate = ""; el.style.rotate = ""; el.style.scale = ""; } });
    document.documentElement.classList.add("reduced");
    $$(".step").forEach((st) => st.classList.add("is-on"));
    unlock();
  };
  setTimeout(() => { if ($("#loader")) bailOut(); }, 9000);
  try {

  /* ---------- Smooth scroll ---------- */
  if (typeof window.Lenis !== "undefined" && finePointer) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", (e) => { ScrollTrigger.update(); onScroll(e.scroll); });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const target = $(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    }));
  } else {
    addEventListener("scroll", () => onScroll(scrollY), { passive: true });
  }

  /* ---------- Preloader → Hero intro ---------- */
  const loaderName = $(".loader__name");
  loaderName.innerHTML = loaderName.textContent.split("").map((c) => `<span>${c === " " ? "&nbsp;" : c}</span>`).join("");
  const count = { v: 0 };
  const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
  intro
    .from(".loader__name span", { yPercent: 110, stagger: 0.035, duration: 1.1 })
    .from(".loader__meta", { opacity: 0, y: 12, duration: .8 }, "-=.7")
    .fromTo(".loader__sun", { yPercent: 40, scale: .7 }, { yPercent: -30, scale: 1, duration: 2.2, ease: "power2.inOut" }, 0)
    .to(count, { v: 100, duration: 2.1, ease: "power2.inOut", onUpdate: () => ($("#loaderCount").textContent = Math.round(count.v)) }, 0)
    .to(".loader__inner", { yPercent: -40, opacity: 0, duration: .8, ease: "power3.in" }, 2.3)
    .to("#loader", { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, 2.6)
    .from(".hero__media video", { scale: 1.25, duration: 2.4, ease: "expo.out" }, 2.8)
    .from(".hero__title .line > span", { yPercent: 115, rotate: 3, stagger: .12, duration: 1.4 }, 3.0)
    .from(".hero__kicker, .hero__lead, .hero__ctas > *", { y: 30, opacity: 0, stagger: .08, duration: 1.1 }, 3.3)
    .from(".hero__card", { y: 80, opacity: 0, rotate: 6, duration: 1.4 }, 3.4)
    .from("#nav", { yPercent: -100, opacity: 0, duration: 1 }, 3.3)
    .add(() => { unlock(); ScrollTrigger.refresh(); });

  /* ---------- Hero parallax ---------- */
  gsap.to(".hero__media video", { yPercent: 14, scale: 1.08, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero__content", { yPercent: -18, opacity: .2, ease: "none", scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true } });
  gsap.to(".hero__card", { yPercent: -60, rotate: -4, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  /* ---------- Manifesto word light-up ---------- */
  gsap.to("#manifesto .w", {
    opacity: 1, stagger: 0.08, ease: "none",
    scrollTrigger: { trigger: "#manifesto", start: "top 80%", end: "bottom 45%", scrub: true },
  });
  gsap.from(".sunmark", { rotate: -180, scale: .4, scrollTrigger: { trigger: ".sunmark", start: "top 90%", end: "top 50%", scrub: true } });

  /* ---------- Generic reveals ---------- */
  $$(".h2, .eyebrow, .about__copy p, .pills, .about__sig, .process__intro p, .channel, .form, .stats__foot, .feature__list li, .projects__head p, .manifesto__foot p").forEach((el) => {
    if (el.closest(".hero") || el.closest(".pcard")) return;
    gsap.from(el, { y: 50, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  /* ---------- Projects: horizontal pin (desktop) ---------- */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 768px)", () => {
    const distance = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -distance(), ease: "none",
      scrollTrigger: {
        trigger: "#projectsPin", start: "top top+=84", end: () => "+=" + distance(), pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set("#projectsBar", { scaleX: self.progress }),
      },
    });
    $$(".pcard__media img", track).forEach((img) => {
      gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: "none", scrollTrigger: { trigger: img.closest(".pcard"), containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
    });
    return () => gsap.set(track, { x: 0 });
  });
  mm.add("(max-width: 767px)", () => {
    gsap.from($$(".pcard", track), { x: 120, opacity: 0, stagger: .12, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: track, start: "top 85%" } });
  });

  /* ---------- Counters ---------- */
  $$("[data-count]").forEach((el) => {
    const o = { v: 0 };
    gsap.to(o, {
      v: +el.dataset.count, duration: 2.2, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
      onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString("fr-CA")),
    });
  });

  /* ---------- About ---------- */
  gsap.fromTo(".about__frame", { clipPath: "inset(100% 0 0 0 round 28px)" }, { clipPath: "inset(0% 0 0 0 round 28px)", duration: 1.6, ease: "expo.inOut", scrollTrigger: { trigger: ".about__frame", start: "top 80%" } });
  gsap.from(".about__halo", { scale: .3, opacity: 0, ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "center center", scrub: true } });

  /* ---------- Destinations ---------- */
  $$(".drow").forEach((row, i) => {
    gsap.from(row.querySelector(".drow__name"), { yPercent: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: row, start: "top 92%" } });
  });
  if (finePointer) {
    const fx = gsap.quickTo(float, "x", { duration: .6, ease: "power3" });
    const fy = gsap.quickTo(float, "y", { duration: .6, ease: "power3" });
    const imgs = $$("img", float);
    list.addEventListener("mousemove", (e) => { fx(e.clientX + 30); fy(e.clientY - 120); });
    $$(".drow").forEach((row) => row.addEventListener("mouseenter", () => {
      imgs.forEach((im, k) => im.classList.toggle("is-on", k === +row.dataset.i));
      float.classList.add("is-on");
    }));
    list.addEventListener("mouseleave", () => float.classList.remove("is-on"));
  }

  /* ---------- Feature ---------- */
  gsap.fromTo("#featureImg", { scale: 1.3 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".feature", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo(".feature__bg", { clipPath: "inset(12% 8% 12% 8% round 40px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", scrollTrigger: { trigger: ".feature", start: "top bottom", end: "top top", scrub: true } });

  /* ---------- Process rail ---------- */
  gsap.to("#stepsRail", { scaleY: 1, ease: "none", scrollTrigger: { trigger: "#steps", start: "top 70%", end: "bottom 60%", scrub: true } });
  $$(".step").forEach((s) => ScrollTrigger.create({ trigger: s, start: "top 68%", onEnter: () => s.classList.add("is-on"), onLeaveBack: () => s.classList.remove("is-on") }));

  /* ---------- CTA sun ---------- */
  gsap.to("#ctaSun", { scale: 1.6, ease: "none", scrollTrigger: { trigger: ".cta", start: "top bottom", end: "bottom 60%", scrub: true } });
  gsap.from(".cta__title", { y: 80, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".cta__title", start: "top 85%" } });

  /* ---------- Footer giant ---------- */
  gsap.from(".footer__giant", { yPercent: 60, ease: "none", scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true } });

  /* ---------- Cursor + magnetic ---------- */
  if (finePointer) {
    const cur = $("#cursor");
    const cx = gsap.quickTo(cur, "x", { duration: .25, ease: "power3" });
    const cy = gsap.quickTo(cur, "y", { duration: .25, ease: "power3" });
    addEventListener("mousemove", (e) => { cx(e.clientX); cy(e.clientY); });
    document.addEventListener("mouseover", (e) => {
      const view = e.target.closest("[data-cursor='view']");
      const link = !view && e.target.closest("a, button, input, select, textarea");
      cur.classList.toggle("is-view", !!view);
      cur.classList.toggle("is-link", !!link);
      cur.textContent = view ? "Voir" : "";
    });
    $$(".magnetic").forEach((btn) => {
      const mx = gsap.quickTo(btn, "x", { duration: .5, ease: "elastic.out(1,.4)" });
      const my = gsap.quickTo(btn, "y", { duration: .5, ease: "elastic.out(1,.4)" });
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .3);
        my((e.clientY - r.top - r.height / 2) * .4);
      });
      btn.addEventListener("mouseleave", () => { mx(0); my(0); });
    });
  } else {
    $("#cursor").remove();
  }

  addEventListener("load", () => ScrollTrigger.refresh());
  } catch (err) {
    bailOut();
  }
})();
