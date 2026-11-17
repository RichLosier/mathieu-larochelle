/* Questionnaire de qualification (5 écrans, FR/EN) : parle au Worker sunset-meta-worker (/form/*, /capi).
   Aucune dépendance. Le pixel Meta ne se charge qu'avec le « oui » du bandeau (clé localStorage « sunset-pixel-consent », comme main.js). */
(() => {
  "use strict";

  const WORKER = "https://sunset-meta-worker.sweet-frog-ea74.workers.dev";
  const META_PIXEL_ID = "1124685616721962";
  const CONSENT_KEY = "sunset-pixel-consent";
  const TOKEN_KEY = "q-token";
  const TOTAL = 5;
  const MOT_MAX = 600;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Base de l'API : le Worker; ?api=<url> seulement en test local. */
  let API = WORKER;
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && params.get("api")) {
    try { API = new URL(params.get("api")).href.replace(/\/+$/, ""); } catch (_) { /* garde le Worker */ }
  }

  /* ---------- Questions : codes envoyés au serveur (liste fermée) ---------- */
  const GROUPS = {
    objectif: { step: 2, multi: true, codes: ["residence_hiver", "retraite", "placement", "location", "mixte"] },
    destination: { step: 2, multi: true, compact: true, codes: ["punta_cana", "cap_cana", "las_terrenas", "santo_domingo", "jarabacoa", "rd_autre", "mexique", "portugal", "dubai", "autre", "pas_decide"] },
    budget: { step: 3, codes: ["lt150", "150_250", "250_400", "400_600", "600_1000", "gt1000", "a_discuter"] },
    chambres: { step: 3, compact: true, codes: ["studio", "1", "2", "3", "4plus", "pas_sur"] },
    financement: { step: 3, codes: ["comptant", "hypotheque", "a_voir"] },
    echeancier: { step: 4, codes: ["lt3m", "3_6m", "6_12m", "1_2a", "gt2a", "explore"] },
    deja_visite: { step: 4, compact: true, codes: ["oui", "non"] },
    decideurs: { step: 4, codes: ["seul", "couple", "famille_associes"] },
    moyen: { step: 5, multi: true, compact: true, codes: ["courriel", "texto", "messenger", "whatsapp"] },
    moment: { step: 5, compact: true, codes: ["matin", "apres_midi", "soir", "indifferent"] },
  };
  const STEP_FIELDS = {
    1: ["prenom", "courriel", "telephone"],
    2: ["objectif", "destination"],
    3: ["budget", "chambres", "financement"],
    4: ["echeancier", "deja_visite", "decideurs"],
    5: ["moyen", "moment", "mot"],
  };
  const FIELD_STEP = {};
  Object.entries(STEP_FIELDS).forEach(([s, fs]) => fs.forEach((f) => { FIELD_STEP[f] = +s; }));
  FIELD_STEP.consentement = 1;
  const FIELD_EL = { prenom: "#q-prenom", courriel: "#q-courriel", telephone: "#q-telephone", consentement: "#q-consent", mot: "#q-mot" };

  /* ---------- Textes ---------- */
  const T = {
    fr: {
      htmlLang: "fr-CA",
      title: "Faisons connaissance · Mathieu Larochelle",
      desc: "Quelques questions pour que Mathieu Larochelle, conseiller immobilier chez Sunset Real Estate, comprenne votre projet.",
      skip: "Aller au contenu", brandAria: "Retour au site de Mathieu Larochelle", role: "Conseiller immobilier · Sunset Real Estate",
      backSite: "Retour au site", langLabel: "Switch to English", langBtn: "EN", loading: "Chargement de vos réponses…",
      stepOf: "Étape {n} sur {t}", progressAria: "Progression du questionnaire",
      s1name: "Vos coordonnées", s2name: "Votre projet", s3name: "Budget et logement", s4name: "Échéancier", s5name: "Comment vous joindre",
      h1: 'Faisons <span class="serif grad">connaissance.</span>',
      l1: "Deux minutes, quelques questions. Mathieu pourra ainsi vous répondre avec des idées qui vous ressemblent.",
      h2: 'Votre <span class="serif grad">projet.</span>',
      l2: "Ce qui vous attire, et l'endroit où vous aimeriez poser vos valises. Il n'y a pas de mauvaise réponse.",
      h3: 'Budget et <span class="serif grad">logement.</span>',
      l3: "Pour que Mathieu cible les bonnes options, sans vous faire perdre de temps.",
      h4: 'Votre <span class="serif grad">échéancier.</span>',
      l4: "Pour savoir à quel rythme avancer, sans aucune pression.",
      h5: 'Comment vous <span class="serif grad">joindre.</span>',
      l5: "Mathieu vous répondra par écrit, de la façon qui vous convient le mieux.",
      f: { prenom: "Prénom", courriel: "Courriel", telephone: "Téléphone", contactHint: "Courriel ou téléphone : l'un des deux suffit.", motPh: "Un projet précis, une question, une contrainte… (facultatif)" },
      consent: 'J\'accepte que Mathieu Larochelle (Sunset Real Estate) me contacte par écrit au sujet de ma demande, et qu\'on me rappelle par courriel si je n\'ai pas terminé ce questionnaire. Je peux me retirer en tout temps. <a href="confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité<span class="sr-only"> (s\'ouvre dans un nouvel onglet)</span></a>',
      hint: { multi: "Plusieurs choix possibles.", budget: "En dollars américains ($ US). Une fourchette suffit." },
      q: {
        objectif: "Qu'est-ce qui vous attire le plus?", destination: "Où rêvez-vous de poser vos valises?",
        budget: "Quel budget envisagez-vous?", chambres: "Combien de chambres?", financement: "Comment pensez-vous financer l'achat?",
        echeancier: "Quand aimeriez-vous passer à l'action?", deja_visite: "Avez-vous déjà visité la République dominicaine?", decideurs: "Qui participera à la décision?",
        moyen: "Comment préférez-vous qu'on vous écrive?", moment: "À quel moment préférez-vous recevoir son message?", mot: "Autre chose que Mathieu devrait savoir?",
      },
      opt: {
        objectif: { residence_hiver: "Une résidence pour l'hiver", retraite: "Une retraite au soleil", placement: "Un placement", location: "Un revenu de location", mixte: "Un peu de tout" },
        destination: { punta_cana: "Punta Cana", cap_cana: "Cap Cana", las_terrenas: "Las Terrenas", santo_domingo: "Santo Domingo", jarabacoa: "Jarabacoa", rd_autre: "Ailleurs en République dominicaine", mexique: "Mexique", portugal: "Portugal", dubai: "Dubaï", autre: "Une autre destination", pas_decide: "Pas encore décidé" },
        budget: { lt150: "Moins de 150 000 $ US", "150_250": "150 000 à 250 000 $ US", "250_400": "250 000 à 400 000 $ US", "400_600": "400 000 à 600 000 $ US", "600_1000": "600 000 à 1 M$ US", gt1000: "Plus de 1 M$ US", a_discuter: "J'aimerais en discuter" },
        chambres: { studio: "Studio", 1: "1 chambre", 2: "2 chambres", 3: "3 chambres", "4plus": "4 et plus", pas_sur: "Je ne sais pas encore" },
        financement: { comptant: "Comptant", hypotheque: "Avec une hypothèque", a_voir: "Je ne sais pas encore" },
        echeancier: { lt3m: "Dans moins de 3 mois", "3_6m": "Dans 3 à 6 mois", "6_12m": "Dans 6 à 12 mois", "1_2a": "Dans 1 à 2 ans", gt2a: "Dans plus de 2 ans", explore: "Je ne fais qu'explorer" },
        deja_visite: { oui: "Oui", non: "Pas encore" },
        decideurs: { seul: "Moi seul(e)", couple: "En couple", famille_associes: "En famille ou avec des associés" },
        moyen: { courriel: "Par courriel", texto: "Par texto", messenger: "Messenger", whatsapp: "WhatsApp" },
        moment: { matin: "Le matin", apres_midi: "L'après-midi", soir: "Le soir", indifferent: "Peu importe" },
      },
      back: "Retour", next: "Continuer", submit: "Envoyer à Mathieu", saving: "Enregistrement…", sending: "Envoi…", retry: "Réessayer",
      resume: "Content de vous revoir, {p}. On reprend là où vous en étiez.", resumeAnon: "Content de vous revoir. On reprend là où vous en étiez.",
      doneH: 'Merci, <span class="serif grad">{p}.</span>', doneHAnon: 'Merci <span class="serif grad">beaucoup.</span>',
      doneP1: "Mathieu a bien reçu vos réponses. Il vous écrit sous peu, par écrit, selon vos préférences.",
      doneP2: "Vous n'avez rien d'autre à faire pour l'instant. Bon soleil d'ici là!",
      stop: "Ne plus recevoir de rappel", stopDone: "C'est noté : aucun rappel ne vous sera envoyé.",
      copy: "© 2026 Mathieu Larochelle · Conseiller immobilier international, Sunset Real Estate", privacy: "Confidentialité",
      err: {
        prenom: "Entrez votre prénom.", contact: "Entrez un courriel ou un téléphone pour que Mathieu puisse vous répondre.",
        mail: "Ce courriel semble incomplet.", tel: "Ce numéro de téléphone semble incomplet.", consent: "Cochez la case de consentement pour continuer.",
        invalid: "Quelques réponses doivent être corrigées.", field: "Cette réponse doit être corrigée.",
        net: "La connexion a été interrompue. Vos réponses sont gardées : réessayez dans un instant.",
        rate: "Beaucoup de demandes en ce moment. Patientez quelques secondes, puis réessayez.",
        server: "Un petit pépin de notre côté. Vos réponses sont gardées : réessayez dans un instant.",
        load: "Impossible de charger vos réponses pour l'instant. Vous pouvez réessayer.",
      },
      banner: "Ce site peut utiliser un pixel publicitaire (Meta) pour mesurer l’efficacité de ses annonces.", bannerMore: "En savoir plus", bannerNo: "Refuser", bannerYes: "Accepter", bannerAria: "Mesure publicitaire",
    },
    en: {
      htmlLang: "en-CA",
      title: "Let's get acquainted · Mathieu Larochelle",
      desc: "A few questions so that Mathieu Larochelle, real estate advisor at Sunset Real Estate, can understand your project.",
      skip: "Skip to content", brandAria: "Back to Mathieu Larochelle's website", role: "Real estate advisor · Sunset Real Estate",
      backSite: "Back to the site", langLabel: "Passer au français", langBtn: "FR", loading: "Loading your answers…",
      stepOf: "Step {n} of {t}", progressAria: "Questionnaire progress",
      s1name: "Your details", s2name: "Your project", s3name: "Budget and home", s4name: "Timeline", s5name: "How to reach you",
      h1: 'Let\'s get <span class="serif grad">acquainted.</span>',
      l1: "Two minutes, a few questions. That way Mathieu can reply with ideas that actually fit you.",
      h2: 'Your <span class="serif grad">project.</span>',
      l2: "What draws you in, and where you would like to land. There are no wrong answers.",
      h3: 'Budget and <span class="serif grad">home.</span>',
      l3: "So Mathieu can aim at the right options without wasting your time.",
      h4: 'Your <span class="serif grad">timeline.</span>',
      l4: "To know what pace suits you, with no pressure at all.",
      h5: 'How to <span class="serif grad">reach you.</span>',
      l5: "Mathieu will reply in writing, whichever way suits you best.",
      f: { prenom: "First name", courriel: "Email", telephone: "Phone", contactHint: "Email or phone: either one is enough.", motPh: "A specific project, a question, a constraint… (optional)" },
      consent: 'I agree that Mathieu Larochelle (Sunset Real Estate) may contact me in writing about my request, and that I may be reminded by email if I haven\'t finished this questionnaire. I can withdraw at any time. <a href="confidentialite.html" target="_blank" rel="noopener">Privacy policy<span class="sr-only"> (opens in a new tab)</span></a>',
      hint: { multi: "You can pick more than one.", budget: "In US dollars (US$). A range is enough." },
      q: {
        objectif: "What draws you in the most?", destination: "Where do you dream of landing?",
        budget: "What budget are you considering?", chambres: "How many bedrooms?", financement: "How do you plan to finance the purchase?",
        echeancier: "When would you like to make a move?", deja_visite: "Have you already visited the Dominican Republic?", decideurs: "Who will be part of the decision?",
        moyen: "How do you prefer to be written to?", moment: "When would you prefer to receive his message?", mot: "Anything else Mathieu should know?",
      },
      opt: {
        objectif: { residence_hiver: "A winter home", retraite: "A retirement in the sun", placement: "An investment", location: "Rental income", mixte: "A bit of everything" },
        destination: { punta_cana: "Punta Cana", cap_cana: "Cap Cana", las_terrenas: "Las Terrenas", santo_domingo: "Santo Domingo", jarabacoa: "Jarabacoa", rd_autre: "Elsewhere in the Dominican Republic", mexique: "Mexico", portugal: "Portugal", dubai: "Dubai", autre: "Another destination", pas_decide: "Not decided yet" },
        budget: { lt150: "Under US$150,000", "150_250": "US$150,000 to $250,000", "250_400": "US$250,000 to $400,000", "400_600": "US$400,000 to $600,000", "600_1000": "US$600,000 to $1M", gt1000: "Over US$1M", a_discuter: "I'd like to talk it over" },
        chambres: { studio: "Studio", 1: "1 bedroom", 2: "2 bedrooms", 3: "3 bedrooms", "4plus": "4 or more", pas_sur: "Not sure yet" },
        financement: { comptant: "Cash", hypotheque: "With a mortgage", a_voir: "Not sure yet" },
        echeancier: { lt3m: "In under 3 months", "3_6m": "In 3 to 6 months", "6_12m": "In 6 to 12 months", "1_2a": "In 1 to 2 years", gt2a: "In over 2 years", explore: "Just exploring" },
        deja_visite: { oui: "Yes", non: "Not yet" },
        decideurs: { seul: "Just me", couple: "With my partner", famille_associes: "With family or partners" },
        moyen: { courriel: "By email", texto: "By text", messenger: "Messenger", whatsapp: "WhatsApp" },
        moment: { matin: "Mornings", apres_midi: "Afternoons", soir: "Evenings", indifferent: "Any time" },
      },
      back: "Back", next: "Continue", submit: "Send to Mathieu", saving: "Saving…", sending: "Sending…", retry: "Try again",
      resume: "Good to see you again, {p}. Let's pick up where you left off.", resumeAnon: "Good to see you again. Let's pick up where you left off.",
      doneH: 'Thank you, <span class="serif grad">{p}.</span>', doneHAnon: 'Thank you <span class="serif grad">so much.</span>',
      doneP1: "Mathieu has received your answers. He will write to you shortly, in writing, the way you prefer.",
      doneP2: "There is nothing else to do for now. Enjoy the sunshine until then!",
      stop: "Stop reminders", stopDone: "Noted: no reminder will be sent to you.",
      copy: "© 2026 Mathieu Larochelle · International real estate advisor, Sunset Real Estate", privacy: "Privacy",
      err: {
        prenom: "Please enter your first name.", contact: "Enter an email or a phone number so Mathieu can reply.",
        mail: "This email looks incomplete.", tel: "This phone number looks incomplete.", consent: "Please tick the consent box to continue.",
        invalid: "A few answers need fixing.", field: "This answer needs fixing.",
        net: "The connection was interrupted. Your answers are kept: please try again in a moment.",
        rate: "Lots of requests right now. Wait a few seconds, then try again.",
        server: "A small hiccup on our side. Your answers are kept: please try again in a moment.",
        load: "We couldn't load your answers right now. You can try again.",
      },
      banner: "This site may use an advertising pixel (Meta) to measure how well its ads perform.", bannerMore: "Learn more", bannerNo: "Decline", bannerYes: "Accept", bannerAria: "Ad measurement",
    },
  };

  /* ---------- État ---------- */
  const st = { lang: "fr", step: 1, t: "", answers: {}, busy: false, retry: null, resumeStep: 0, startSent: false, started: false };
  const tr = (key, vars) => {
    let v = key.split(".").reduce((o, k) => (o == null ? o : o[k]), T[st.lang]);
    if (typeof v !== "string") return key;
    if (vars) Object.keys(vars).forEach((k) => { v = v.split(`{${k}}`).join(vars[k]); });
    return v;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const form = $("#q-form");
  const els = {
    progress: $("#q-progress"), label: $("#q-progress-label"), track: $("#q-progress-track"), bar: $("#q-progress-bar"),
    loading: $("#q-loading"), back: $("#q-back"), next: $("#q-next"), submit: $("#q-submit"),
    error: $("#q-error"), errorMsg: $("#q-error-msg"), retry: $("#q-retry"), done: $("#q-done"), resume: $("#q-resume"),
    stopWrap: $("#q-stop-wrap"), stop: $("#q-stop"), lang: $("#q-lang"), mot: $("#q-mot"), count: $("#q-count"),
  };
  const steps = $$("[data-step]");
  const heads = $$("[data-head]");

  /* ---------- Réseau ---------- */
  const call = async (method, path, body) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(API + path, { method, mode: "cors", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
      let json = {};
      try { json = (await r.json()) || {}; } catch (_) { /* corps vide */ }
      return { status: r.status, ok: r.ok && json.ok !== false, json };
    } catch (_) {
      return { status: 0, ok: false, net: true, json: {} };
    } finally {
      clearTimeout(timer);
    }
  };

  /* ---------- Consentement, pixel et API de conversions (copie fidèle de main.js) ---------- */
  const readConsent = () => { try { return localStorage.getItem(CONSENT_KEY); } catch (_) { return null; } };
  const saveConsent = (v) => { try { localStorage.setItem(CONSENT_KEY, v); } catch (_) { /* ignore */ } };
  const consentYes = () => readConsent() === "yes";
  const CAPI_ENDPOINT = API + "/capi";
  const newId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const cookie = (n) => { const m = document.cookie.match(new RegExp(`(?:^|; )${n}=([^;]*)`)); return m ? decodeURIComponent(m[1]) : ""; };
  const metaIds = () => ({ fbp: cookie("_fbp"), fbc: cookie("_fbc") });
  const pageUrl = () => location.origin + location.pathname;
  const pixel = (name, eventId = newId(), p = {}, custom = false) => {
    try {
      if (!(META_PIXEL_ID && window.fbq && readConsent() === "yes")) return eventId;
      fbq(custom ? "trackCustom" : "track", name, p, { eventID: eventId });
      if (CAPI_ENDPOINT && name !== "Lead") {
        fetch(CAPI_ENDPOINT, { method: "POST", body: JSON.stringify({ event_name: name, event_id: eventId, url: pageUrl(), pixel_consent: true, custom_data: p, ...metaIds() }), keepalive: true, mode: "cors" }).catch(() => {});
      }
    } catch (_) { /* ignore */ }
    return eventId;
  };
  const loadPixel = () => {
    if (window.fbq) return;
    !(function (f, b, e, v, n, t, s) {
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", META_PIXEL_ID); pixel("PageView");
  };
  /* FormStart : une seule fois, dès qu'un jeton existe ET que le pixel est permis. */
  const maybeStart = () => {
    if (!st.started || st.startSent || !consentYes() || !window.fbq) return;
    st.startSent = true;
    pixel("FormStart", newId(), {}, true);
  };

  /* Paramètres de campagne (UTM), gardés pour la session comme sur le site. */
  const trackingParams = () => {
    const out = {};
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem("utm") || "{}"); } catch (_) { /* ignore */ }
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
      const v = params.get(k) || saved[k];
      if (v) out[k] = v;
    });
    try { sessionStorage.setItem("utm", JSON.stringify(out)); } catch (_) { /* ignore */ }
    return out;
  };

  /* Le jeton reste dans l'URL (reprise par lien). Si le pixel est permis, on le retire de la barre d'adresse :
     le pixel lit l'adresse de la page et ne doit jamais recevoir le jeton, qui ouvre les réponses de la personne. */
  const syncUrl = () => {
    try {
      const u = new URL(location.href);
      if (st.t && !consentYes()) u.searchParams.set("t", st.t); else u.searchParams.delete("t");
      history.replaceState(null, "", u);
    } catch (_) { /* ignore */ }
  };
  const setToken = (t) => {
    if (!t) return;
    st.t = t;
    try { sessionStorage.setItem(TOKEN_KEY, t); } catch (_) { /* ignore */ }
    syncUrl();
    els.stopWrap.hidden = false;
  };

  const showBanner = () => {
    if (!META_PIXEL_ID || readConsent()) return;
    let bar = $(".consent");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "consent"; bar.setAttribute("role", "dialog");
      bar.addEventListener("click", (e) => {
        const c = e.target.closest("[data-c]"); if (!c) return;
        saveConsent(c.dataset.c); bar.remove(); document.body.classList.remove("q-banner");
        if (c.dataset.c === "yes") { syncUrl(); loadPixel(); maybeStart(); }
      });
      document.body.appendChild(bar);
    }
    bar.setAttribute("aria-label", tr("bannerAria"));
    bar.innerHTML = `<p>${tr("banner")} <a href="confidentialite.html">${tr("bannerMore")}</a></p><div class="consent__btns"><button type="button" class="btn btn--ghost" data-c="no">${tr("bannerNo")}</button><button type="button" class="btn btn--sun" data-c="yes">${tr("bannerYes")}</button></div>`;
    document.body.classList.add("q-banner");
  };

  /* ---------- Langue ---------- */
  const applyLang = () => {
    const L = T[st.lang];
    document.documentElement.lang = L.htmlLang;
    document.title = L.title;
    const md = $('meta[name="description"]'); if (md) md.setAttribute("content", L.desc);
    $$("[data-i18n]").forEach((el) => { el.textContent = tr(el.dataset.i18n); });
    $$("[data-i18n-html]").forEach((el) => { el.innerHTML = tr(el.dataset.i18nHtml); });
    $$("[data-i18n-ph]").forEach((el) => el.setAttribute("placeholder", tr(el.dataset.i18nPh)));
    $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", tr(el.dataset.i18nAria)));
    els.lang.textContent = L.langBtn; els.lang.setAttribute("aria-label", L.langLabel); els.lang.lang = st.lang === "fr" ? "en" : "fr";
    els.track.setAttribute("aria-label", tr("progressAria"));
    $$("[data-opt]").forEach((el) => { el.textContent = tr(`opt.${el.dataset.opt}`); });
    if (!els.done.hidden) renderDone();
    if (els.progress && !els.progress.hidden) els.label.textContent = tr("stepOf", { n: st.step, t: TOTAL });
    if ($(".consent")) { $(".consent").remove(); showBanner(); }
    if (st.resumeShown) showResume();
  };
  const setLang = (l, { silent = false } = {}) => {
    st.lang = l === "en" ? "en" : "fr";
    applyLang();
    if (!silent) {
      try { const u = new URL(location.href); u.searchParams.set("l", st.lang); history.replaceState(null, "", u); } catch (_) { /* ignore */ }
    }
  };

  /* ---------- Cartes de choix ---------- */
  const buildOptions = () => {
    Object.entries(GROUPS).forEach(([name, g]) => {
      const box = $(`[data-group="${name}"]`);
      if (!box) return;
      if (g.compact) box.classList.add("q-opts--c");
      box.innerHTML = g.codes.map((code, i) => `<label class="q-opt q-opt--${g.multi ? "check" : "radio"}" data-field="${name}" data-value="${code}" style="--i:${i}"><input type="${g.multi ? "checkbox" : "radio"}" name="${name}" value="${code}" id="q-${name}-${code}"><span class="q-opt__mark" aria-hidden="true"></span><span class="q-opt__txt" data-opt="${name}.${code}"></span></label>`).join("");
    });
  };
  const choiceValue = (name) => {
    const g = GROUPS[name];
    const on = $$(`input[name="${name}"]:checked`, form).map((i) => i.value);
    return g.multi ? on : (on[0] || "");
  };
  const paintChoices = () => {
    Object.keys(GROUPS).forEach((name) => {
      const v = st.answers[name];
      const set = new Set(Array.isArray(v) ? v : v ? [v] : []);
      $$(`input[name="${name}"]`, form).forEach((i) => { i.checked = set.has(i.value); i.closest(".q-opt").classList.toggle("is-on", i.checked); });
    });
  };

  /* ---------- Lecture / écriture des réponses ---------- */
  const readStep = (n) => {
    STEP_FIELDS[n].forEach((f) => {
      if (GROUPS[f]) st.answers[f] = choiceValue(f);
      else if (f === "mot") st.answers.mot = els.mot.value.trim().slice(0, MOT_MAX);
      else st.answers[f] = ($(FIELD_EL[f]).value || "").trim();
    });
  };
  const fillDom = () => {
    const a = st.answers;
    ["prenom", "courriel", "telephone"].forEach((f) => { $(FIELD_EL[f]).value = a[f] || ""; });
    els.mot.value = a.mot || "";
    els.count.textContent = `${els.mot.value.length} / ${MOT_MAX}`;
    $("#q-consent").checked = !!st.consent;
    paintChoices();
  };
  const dataFor = (n) => {
    const out = {};
    STEP_FIELDS[n].forEach((f) => {
      const v = st.answers[f];
      if (Array.isArray(v) ? v.length : v) out[f] = v;
    });
    return out;
  };

  /* ---------- Erreurs ---------- */
  const clearErrors = () => {
    $$(".q-err", form).forEach((p) => { p.hidden = true; p.textContent = ""; });
    $$("[aria-invalid]", form).forEach((e) => e.removeAttribute("aria-invalid"));
    els.error.hidden = true; els.errorMsg.textContent = ""; els.retry.hidden = true; st.retry = null;
  };
  const fieldError = (name, msg) => {
    const p = $(`#q-err-${name}`);
    if (p) { p.textContent = msg; p.hidden = false; }
    const el = FIELD_EL[name] ? $(FIELD_EL[name]) : $(`[data-set="${name}"]`);
    if (el) el.setAttribute("aria-invalid", "true");
    return el;
  };
  const globalError = (msg, retry) => {
    els.errorMsg.textContent = msg; els.error.hidden = false;
    st.retry = retry || null; els.retry.hidden = !retry;
  };
  const focusField = (name) => {
    const el = FIELD_EL[name] ? $(FIELD_EL[name]) : $(`[data-set="${name}"] input`);
    if (el) el.focus();
  };
  const validateStep1 = () => {
    const a = st.answers;
    let first = null;
    const bad = (name, msg) => { fieldError(name, msg); first = first || name; };
    if (a.prenom.length < 2) bad("prenom", tr("err.prenom"));
    if (!a.courriel && !a.telephone) bad("courriel", tr("err.contact"));
    else {
      if (a.courriel && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.courriel)) bad("courriel", tr("err.mail"));
      if (a.telephone && a.telephone.replace(/\D/g, "").length < 7) bad("telephone", tr("err.tel"));
    }
    if (!st.consent) bad("consentement", tr("err.consent"));
    if (first) focusField(first);
    return !first;
  };
  const serverFailure = (r, retry) => {
    if (r.status === 400 && Array.isArray(r.json.champs) && r.json.champs.length) {
      const champs = r.json.champs.filter((c) => FIELD_STEP[c]);
      const target = champs.length ? Math.min(...champs.map((c) => FIELD_STEP[c])) : st.step;
      if (target !== st.step) show(target, { focus: false });
      let first = null;
      champs.forEach((c) => { fieldError(c, tr("err.field")); first = first || c; });
      globalError(tr("err.invalid"));
      if (first) focusField(first);
      return;
    }
    if (r.status === 429) return globalError(tr("err.rate"), retry);
    globalError(r.net ? tr("err.net") : tr("err.server"), retry);
  };

  /* ---------- Affichage des écrans ---------- */
  const restartAnim = (el) => { el.classList.remove("is-in"); void el.offsetWidth; el.classList.add("is-in"); };
  const setBusy = (on, labelKey) => {
    st.busy = on;
    [els.next, els.submit, els.back].forEach((b) => { b.disabled = on; });
    form.setAttribute("aria-busy", String(on));
    const lab = st.step === TOTAL ? $("#q-submit-label") : $("#q-next-label");
    lab.textContent = tr(on ? labelKey : st.step === TOTAL ? "submit" : "next");
  };
  const showResume = () => {
    const p = st.answers.prenom;
    els.resume.textContent = p ? tr("resume", { p }) : tr("resumeAnon");
    els.resume.hidden = false; st.resumeShown = true;
  };
  function show(n, { focus = true } = {}) {
    st.step = n;
    steps.forEach((s) => { s.hidden = +s.dataset.step !== n; });
    heads.forEach((h) => { h.hidden = +h.dataset.head !== n; });
    els.progress.hidden = false; form.hidden = false; els.done.hidden = true; els.loading.hidden = true;
    els.label.textContent = tr("stepOf", { n, t: TOTAL });
    els.bar.style.transform = `scaleX(${n / TOTAL})`;
    els.track.setAttribute("aria-valuenow", String(n));
    els.back.hidden = n === 1; els.next.hidden = n === TOTAL; els.submit.hidden = n !== TOTAL;
    if (n !== st.resumeStep) { els.resume.hidden = true; st.resumeShown = false; }
    $("#q-next-label").textContent = tr("next"); $("#q-submit-label").textContent = tr("submit");
    document.body.dataset.step = String(n);
    restartAnim($(`[data-step="${n}"]`)); restartAnim($(`[data-head="${n}"]`));
    if (focus) {
      scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      $(`[data-head="${n}"] .q-title`).focus({ preventScroll: true });
    }
  }
  function renderDone() {
    const p = st.answers.prenom;
    $("#q-done-title").innerHTML = p ? tr("doneH", { p: esc(p) }) : tr("doneHAnon");
  }
  const showDone = () => {
    form.hidden = true; els.progress.hidden = true; els.loading.hidden = true; els.done.hidden = false;
    renderDone();
    document.body.dataset.step = "done";
    restartAnim(els.done);
    scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    $("#q-done-title").focus({ preventScroll: true });
  };

  /* ---------- Actions ---------- */
  const doNext = async () => {
    if (st.busy) return;
    clearErrors();
    readStep(st.step);
    if (st.step === 1 && !validateStep1()) return;
    const n = st.step;
    const body = {
      ...(st.t ? { t: st.t } : {}), step: n, lang: st.lang, data: dataFor(n),
      ...(n === 1 ? { consentement: true } : {}),
      pixel_consent: consentYes(), utm: trackingParams(), ...metaIds(), page: pageUrl(), hp: $("#q-hp").value || "",
    };
    setBusy(true, "saving");
    const r = await call("POST", "/form/save", body);
    setBusy(false);
    if (!r.ok) return serverFailure(r, doNext);
    setToken(r.json.t);
    st.started = true; maybeStart();
    pixel("FormStep", r.json.event_id || newId(), { step: n }, true);
    show(Math.min(n + 1, TOTAL));
  };
  const doSubmit = async () => {
    if (st.busy) return;
    clearErrors();
    readStep(TOTAL);
    const evId = newId();
    const body = { t: st.t, lang: st.lang, data: dataFor(TOTAL), event_id: evId, pixel_consent: consentYes(), ...metaIds(), page: pageUrl(), hp: $("#q-hp").value || "" };
    setBusy(true, "sending");
    const r = await call("POST", "/form/complete", body);
    setBusy(false);
    if (!r.ok || r.json.done === false) return serverFailure(r, doSubmit);
    pixel("Lead", r.json.event_id || evId); // le serveur envoie lui-même Lead à l'API de conversions
    showDone();
  };
  const act = () => (st.step === TOTAL ? doSubmit() : doNext());
  const doBack = () => { if (st.busy || st.step === 1) return; clearErrors(); readStep(st.step); show(st.step - 1); };
  const doStop = async () => {
    if (!st.t) return;
    els.stop.disabled = true;
    const r = await call("POST", "/form/stop", { t: st.t });
    if (r.ok) els.stopWrap.textContent = tr("stopDone");
    else { els.stop.disabled = false; globalError(r.net ? tr("err.net") : tr("err.server")); }
  };

  /* ---------- Chargement de la session (reprise) ---------- */
  const isDoneStatus = (s) => /^(complet|complete|completed|done|termin)/i.test(String(s || ""));
  const start = async () => {
    let t = params.get("t") || "";
    if (!t) { // rechargement après que l'adresse ait été nettoyée (pixel permis) : jeton gardé pour cet onglet seulement
      try {
        const nav = performance.getEntriesByType("navigation")[0];
        if (nav && (nav.type === "reload" || nav.type === "back_forward")) t = sessionStorage.getItem(TOKEN_KEY) || "";
      } catch (_) { /* ignore */ }
    }
    if (t) { st.t = t; st.started = true; syncUrl(); els.stopWrap.hidden = false; }
    if (!t) { fillDom(); show(1, { focus: false }); return; }

    els.loading.hidden = false;
    const r = await call("GET", `/form/session?t=${encodeURIComponent(t)}`);
    els.loading.hidden = true;
    if (r.status === 404) { st.t = ""; st.started = false; els.stopWrap.hidden = true; try { sessionStorage.removeItem(TOKEN_KEY); } catch (_) { /* ignore */ } syncUrl(); fillDom(); show(1, { focus: false }); return; }
    if (!r.ok) {
      fillDom(); show(1, { focus: false });
      globalError(tr("err.load"), () => { clearErrors(); start(); });
      return;
    }
    const j = r.json;
    if (!params.get("l") && (j.lang === "fr" || j.lang === "en")) setLang(j.lang, { silent: true });
    const a = j.answers || {};
    const prenom = (a.prenom || j.prenom || "").toString();
    st.answers = { ...a, prenom };
    st.consent = (j.step || 0) >= 1;
    maybeStart();
    fillDom();
    if (isDoneStatus(j.status) || (j.step || 0) >= TOTAL) { showDone(); return; }
    const resumeAt = Math.min(Math.max((j.step || 0) + 1, 1), TOTAL);
    st.resumeStep = (j.step || 0) >= 1 ? resumeAt : 0;
    show(resumeAt, { focus: false });
    if (st.resumeStep) showResume();
  };

  /* ---------- Démarrage ---------- */
  const init = () => {
    const ql = params.get("l");
    const nav = (navigator.language || "fr").toLowerCase();
    setLang(ql === "en" || ql === "fr" ? ql : nav.startsWith("en") ? "en" : "fr", { silent: true });
    buildOptions();
    applyLang();
    trackingParams();

    form.addEventListener("submit", (e) => e.preventDefault());
    form.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing || e.target.tagName !== "INPUT" || e.target.type === "checkbox" || e.target.type === "radio") return;
      e.preventDefault(); act();
    });
    form.addEventListener("change", (e) => {
      const i = e.target;
      if (i.matches(".q-opt input")) {
        const name = i.name;
        $$(`input[name="${name}"]`, form).forEach((x) => x.closest(".q-opt").classList.toggle("is-on", x.checked));
        $(`[data-set="${name}"]`)?.removeAttribute("aria-invalid"); const p = $(`#q-err-${name}`); if (p) p.hidden = true;
      } else if (i.id === "q-consent") {
        st.consent = i.checked; i.removeAttribute("aria-invalid"); $("#q-err-consentement").hidden = true;
      }
    });
    form.addEventListener("input", (e) => {
      const i = e.target;
      if (i.id === "q-mot") els.count.textContent = `${i.value.length} / ${MOT_MAX}`;
      if (i.classList.contains("q-input")) { i.removeAttribute("aria-invalid"); const p = $(`#q-err-${i.name}`); if (p) p.hidden = true; }
      if (!els.error.hidden && !st.busy) { els.error.hidden = true; }
    });
    els.next.addEventListener("click", doNext);
    els.submit.addEventListener("click", doSubmit);
    els.back.addEventListener("click", doBack);
    els.retry.addEventListener("click", () => { if (st.retry) st.retry(); });
    els.stop.addEventListener("click", doStop);
    els.lang.addEventListener("click", () => setLang(st.lang === "fr" ? "en" : "fr"));

    // Pixel : l'adresse est nettoyée du jeton AVANT que le pixel ne se charge.
    const t0 = params.get("t");
    if (t0 && consentYes()) { st.t = t0; syncUrl(); }
    if (META_PIXEL_ID) { if (consentYes()) loadPixel(); else showBanner(); }

    start();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
