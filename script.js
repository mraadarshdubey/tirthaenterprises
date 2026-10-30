/* ==========================================================================
   TIRTHA ENTERPRISES — interactions
   Plain vanilla JS. No dependencies.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Configuration
     ------------------------------------------------------------------ */
  // Point this at your lead endpoint (server route / secure webhook proxy).
  // While it is empty, submissions show the honest failure state — never a
  // fake success. Example: "https://api.yourdomain.example/leads"
  var LEAD_ENDPOINT = "";

  var GOALS = {
    retirement: {
      title: "Retirement",
      topic: "Retirement Planning",
      context: "You selected Retirement Planning. Let us start with your questions around that goal."
    },
    child: {
      title: "Child's Future",
      topic: "Financial Goal Planning",
      context: "You selected your Child's Future. Tell us what you would like to understand."
    },
    wealth: {
      title: "Long-Term Wealth",
      topic: "Long-Term Investment",
      context: "You selected Long-Term Wealth. Let us start with the concepts you want clarity on."
    },
    other: {
      title: "Another Life Goal",
      topic: "Other",
      context: "Tell us about the financial goal you are planning for."
    }
  };

  var DEFAULT_CONTEXT = "You can begin even if you are not sure which investment option is relevant.";

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function smoothScrollTo(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
  }

  /* ------------------------------------------------------------------
     Analytics (privacy-safe: never send PII)
     ------------------------------------------------------------------ */
  function track(event, data) {
    var payload = Object.assign({ event: event }, data || {});
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
      if (typeof window.gtag === "function") { window.gtag("event", event, data || {}); }
    } catch (err) { /* analytics must never break the page */ }
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-event]");
    if (!el) return;
    track(el.getAttribute("data-event"));
  });

  /* ------------------------------------------------------------------
     Header scroll state
     ------------------------------------------------------------------ */
  var header = $("#siteHeader");
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ------------------------------------------------------------------
     Active nav indicator
     ------------------------------------------------------------------ */
  var navLinks = $all("[data-nav]");
  if ("IntersectionObserver" in window && navLinks.length) {
    var navMap = {};
    navLinks.forEach(function (a) { navMap[a.getAttribute("data-nav")] = a; });

    var sectionSpy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (a) {
          var active = a.getAttribute("data-nav") === id;
          a.classList.toggle("is-active", active);
          if (active) { a.setAttribute("aria-current", "true"); }
          else { a.removeAttribute("aria-current"); }
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px" });

    ["manifesto", "understand", "questions", "about"].forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) sectionSpy.observe(sec);
    });
  }

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */
  var revealEls = $all("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ------------------------------------------------------------------
     Life Goal Atlas — hover highlights paths, click selects the goal
     ------------------------------------------------------------------ */
  var atlas = $("#goalAtlas");
  if (atlas) {
    var paths = {};
    $all("[data-path-for]", atlas).forEach(function (p) { paths[p.getAttribute("data-path-for")] = p; });

    $all(".atlas__node", atlas).forEach(function (node) {
      var id = node.getAttribute("data-goal");
      function light(on) {
        if (paths[id]) paths[id].classList.toggle("is-active", on);
      }
      node.addEventListener("mouseenter", function () { light(true); });
      node.addEventListener("mouseleave", function () { light(node.getAttribute("aria-pressed") !== "true"); });
      node.addEventListener("focus", function () { light(true); });
      node.addEventListener("blur", function () { light(node.getAttribute("aria-pressed") !== "true"); });
      node.addEventListener("click", function () {
        selectGoal(id);
        var target = document.getElementById("goals");
        if (target) smoothScrollTo(target);
      });
    });
  }

  /* ------------------------------------------------------------------
     Goal selection (single source of truth)
     ------------------------------------------------------------------ */
  var state = { goal: null, topicsTouched: false };
  var goalRows = $all(".goal-row");
  var atlasNodes = $all(".atlas__node");

  var panelLabel = $("[data-panel-label]");
  var panelTitle = $("[data-panel-title]");
  var panelBody = $("[data-panel-body]");
  var panelCta = $("[data-panel-cta]");
  var contextLine = $("[data-context-line]");
  var goalAnswers = {};
  var brief = $("[data-goal-brief]");
  var questionHost = $("[data-goal-questions]");
  var briefSummary = $("[data-goal-summary]");
  var clearGoal = $("[data-clear-goal]");
  var goalContext = $("[data-goal-context]");
  var goalDefinitions = {
    retirement: { intro: "Start by describing where you are in your retirement planning.", question: "What stage are you at?", options: ["Exploring retirement", "Have a timeframe in mind", "Approaching retirement", "Not sure yet"], action: "Discuss my retirement goal" },
    child: { intro: "Start with the milestone you would like to prepare for.", question: "Which milestone are you planning for?", options: ["Education", "Another milestone", "Not sure yet"], action: "Discuss my child’s future" },
    wealth: { intro: "Think about what you would like your future savings to support.", question: "What would you like this goal to support?", options: ["Future flexibility", "A major milestone", "Still exploring"], action: "Discuss my long-term goal" },
    other: { intro: "Describe the goal in your own words, if you would like.", question: "What are you planning for?", action: "Discuss this goal" }
  };
  var horizons = ["Within 3 years", "3–7 years", "More than 7 years", "Not sure yet"];
  function answersFor(id) {
    if (!goalAnswers[id]) goalAnswers[id] = { purpose: "", horizon: "", description: "" };
    return goalAnswers[id];
  }
  function goalSummary() {
    if (!state.goal) return "";
    var a = answersFor(state.goal), subject;
    if (state.goal === "child") subject = a.purpose === "Education" ? "You’re planning for education" : a.purpose === "Another milestone" ? "You’re planning for another milestone in your child’s future" : "You’re exploring your child’s future";
    else if (state.goal === "retirement") subject = a.purpose === "Approaching retirement" ? "You’re approaching retirement" : a.purpose === "Have a timeframe in mind" ? "You’re planning for retirement with a timeframe in mind" : "You’re exploring retirement planning";
    else if (state.goal === "wealth") subject = a.purpose === "Future flexibility" ? "You’re planning for future flexibility" : a.purpose === "A major milestone" ? "You’re planning for a major milestone" : "You’re exploring a long-term financial goal";
    else subject = a.description.trim() ? "Your goal: “" + a.description.trim() + "”" : "You’re exploring another life goal";
    var time = { "Within 3 years": "within three years", "3–7 years": "in three to seven years", "More than 7 years": "in more than seven years" };
    if (time[a.horizon]) return subject + ". You may need the money " + time[a.horizon] + ".";
    if (a.horizon === "Not sure yet") return subject + ". You’re still working out the timeframe.";
    return subject + ". Your timeframe is still open.";
  }
  function updateGoalBrief() {
    if (!state.goal) return;
    var a = answersFor(state.goal), summary = goalSummary();
    if (briefSummary) briefSummary.textContent = summary;
    if (clearGoal) clearGoal.hidden = !(a.purpose || a.horizon || a.description);
    if (goalContext) {
      goalContext.hidden = false;
      $("[data-enquiry-goal]").textContent = "Your goal: " + GOALS[state.goal].title;
      var details = [state.goal === "other" ? a.description.trim() : a.purpose, a.horizon].filter(Boolean);
      $("[data-enquiry-goal-details]").textContent = details.join(" · ");
      $("[data-enquiry-goal-details]").hidden = !details.length;
    }
    if (contextLine) contextLine.textContent = summary;
  }
  function addChoices(question, name, options, value) {
    var field = document.createElement("fieldset"), legend = document.createElement("legend"), choices = document.createElement("div");
    field.className = "goal-brief__question"; legend.textContent = question; choices.className = "goal-brief__choices";
    field.appendChild(legend);
    options.forEach(function (option) {
      var label = document.createElement("label"), input = document.createElement("input"), text = document.createElement("span");
      label.className = "goal-brief__choice"; input.type = "radio"; input.name = "goal-brief-" + name; input.value = option; input.checked = option === value; text.textContent = option;
      input.addEventListener("change", function () { answersFor(state.goal)[name] = option; updateGoalBrief(); });
      label.appendChild(input); label.appendChild(text); choices.appendChild(label);
    });
    field.appendChild(choices); questionHost.appendChild(field);
  }
  function renderGoalBrief() {
    if (!brief || !questionHost) return;
    var def = goalDefinitions[state.goal], a = answersFor(state.goal);
    $("#goalPanel").classList.add("has-goal"); brief.hidden = false; questionHost.replaceChildren();
    if (state.goal === "other") {
      var field = document.createElement("div"), label = document.createElement("label"), input = document.createElement("input"), helper = document.createElement("p");
      field.className = "goal-brief__question"; label.htmlFor = "custom-goal"; label.textContent = def.question;
      input.id = "custom-goal"; input.type = "text"; input.maxLength = 160; input.placeholder = "For example, buying a home"; input.value = a.description; input.setAttribute("aria-describedby", "custom-goal-help");
      helper.id = "custom-goal-help"; helper.className = "goal-brief__helper"; helper.textContent = "A short description is enough. You can leave this blank.";
      input.addEventListener("input", function () { answersFor("other").description = input.value; if (clearGoal) clearGoal.hidden = false; });
      input.addEventListener("blur", updateGoalBrief);
      field.appendChild(label); field.appendChild(input); field.appendChild(helper); questionHost.appendChild(field);
    } else addChoices(def.question, "purpose", def.options, a.purpose);
    addChoices("When might you need the money?", "horizon", horizons, a.horizon);
    $("[data-goal-action]").textContent = def.action;
    updateGoalBrief();
  }
  if (clearGoal) clearGoal.addEventListener("click", function () {
    goalAnswers[state.goal] = { purpose: "", horizon: "", description: "" }; renderGoalBrief(); $("[data-panel-title]").focus({ preventScroll: true });
  });
  var editGoal = $("[data-edit-goal]");
  if (editGoal) editGoal.addEventListener("click", function (e) {
    e.preventDefault();
    smoothScrollTo($("#goalPanel"));
    $("[data-panel-title]").focus({ preventScroll: true });
  });

  function selectGoal(id) {
    if (!GOALS[id]) return;
    state.goal = id;

    goalRows.forEach(function (row) {
      row.setAttribute("aria-pressed", row.getAttribute("data-goal") === id ? "true" : "false");
    });
    atlasNodes.forEach(function (node) {
      var on = node.getAttribute("data-goal") === id;
      node.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $all("[data-path-for]").forEach(function (p) {
      p.classList.toggle("is-active", p.getAttribute("data-path-for") === id);
    });

    if (panelLabel) panelLabel.textContent = "You selected";
    if (panelTitle) panelTitle.textContent = GOALS[id].title;
    if (panelBody) panelBody.textContent = goalDefinitions[id].intro;
    if (panelCta) panelCta.hidden = false;
    if (contextLine) contextLine.textContent = GOALS[id].context;
    renderGoalBrief();

    // Preselect the mapped topic in the enquiry form unless the visitor
    // has already made their own topic choices.
    if (!state.topicsTouched) {
      $all('input[name="topics"]').forEach(function (cb) {
        cb.checked = cb.value === GOALS[id].topic;
      });
    }

    track("goal_selected", { goal: id });
  }

  goalRows.forEach(function (row) {
    row.addEventListener("click", function () { selectGoal(row.getAttribute("data-goal")); });
  });

  /* ------------------------------------------------------------------
     Journey — sticky stage counter + markers
     ------------------------------------------------------------------ */
  var journeyCards = $all(".journey-card");
  var jNum = $("[data-journey-number]");
  var jLabel = $("[data-journey-label]");
  var stagesViewed = {};

  if ("IntersectionObserver" in window && journeyCards.length) {
    var journeyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var card = entry.target;
        var idx = parseInt(card.getAttribute("data-stage"), 10);
        if (entry.isIntersecting) {
          card.classList.add("is-active");
          if (jNum) jNum.textContent = ("0" + (idx + 1)).slice(-2);
          if (jLabel) jLabel.textContent = card.getAttribute("data-stage-label") || "";
          if (!stagesViewed[idx]) {
            stagesViewed[idx] = true;
            track("journey_stage_viewed", { stage: idx + 1 });
          }
        } else {
          card.classList.remove("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    journeyCards.forEach(function (card) { journeyIO.observe(card); });
  }

  /* ------------------------------------------------------------------
     Learning modules — accordions on mobile, always open on desktop
     ------------------------------------------------------------------ */
  var desktopMq = window.matchMedia("(min-width: 769px)");
  var modules = $all("[data-module]");

  function syncModules() {
    modules.forEach(function (d) {
      if (desktopMq.matches && !d.open) { d.open = true; }
    });
  }
  syncModules();
  if (typeof desktopMq.addEventListener === "function") {
    desktopMq.addEventListener("change", syncModules);
  }

  modules.forEach(function (d) {
    var opened = false;
    d.addEventListener("toggle", function () {
      if (d.open && !opened) {
        opened = true;
        track("education_module_opened", { module: (d.querySelector(".micro") || {}).textContent || "" });
      }
    });
  });

  /* ------------------------------------------------------------------
     Guided enquiry form
     ------------------------------------------------------------------ */
  var form = $("#enquiryForm");

  if (form) {
    var steps = $all(".gform__step", form);
    var fill = $("[data-progress-fill]", form);
    var pLabels = $all("[data-plabel]", form);
    var status = $("[data-form-status]", form);
    var successBox = $("[data-success]");
    var failureBox = $("[data-failure]");
    var submitBtn = $("[data-submit]", form);
    var submitLabel = $("[data-submit-label]", form);
    var current = 1;
    var started = false;
    var submitting = false;

    function markStarted() {
      if (started) return;
      started = true;
      track("enquiry_started");
    }
    form.addEventListener("focusin", markStarted);
    form.addEventListener("change", function () {
      markStarted();
      state.topicsTouched = true;
    });
    form.addEventListener("input", markStarted);

    function setProgress(step) {
      if (fill) fill.style.width = (step / 3) * 100 + "%";
      pLabels.forEach(function (li) {
        var n = parseInt(li.getAttribute("data-plabel"), 10);
        li.classList.toggle("is-active", n === step);
        li.classList.toggle("is-done", n < step);
      });
    }

    function showStep(step) {
      current = step;
      steps.forEach(function (fs) {
        fs.classList.toggle("is-active", parseInt(fs.getAttribute("data-step"), 10) === step);
      });
      setProgress(step);
      if (status) status.textContent = "Step " + step + " of 3.";
      var legend = $('fieldset[data-step="' + step + '"] .gform__q', form);
      if (legend) legend.focus({ preventScroll: true });
      if (legend) legend.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "nearest" });
    }

    function setError(key, inputEl, show) {
      var err = $('[data-error-for="' + key + '"]', form);
      if (err) err.hidden = !show;
      if (inputEl) {
        if (show) inputEl.setAttribute("aria-invalid", "true");
        else inputEl.removeAttribute("aria-invalid");
      }
    }

    function validMobile(v) {
      var digits = v.replace(/\D/g, "");
      if (digits.length === 12 && digits.indexOf("91") === 0) digits = digits.slice(2);
      if (digits.length === 11 && digits.charAt(0) === "0") digits = digits.slice(1);
      return /^[6-9]\d{9}$/.test(digits);
    }

    function validateStep2() {
      var chosen = !!$('input[name="investing"]:checked', form);
      setError("investing", null, !chosen);
      return chosen;
    }

    function validateStep3() {
      var ok = true;
      var name = $("#f-name", form);
      var mobile = $("#f-mobile", form);
      var email = $("#f-email", form);
      var consent = $("#f-consent", form);
      var firstBad = null;

      var nameOk = !!name.value.trim();
      setError("name", name, !nameOk);
      if (!nameOk) { ok = false; firstBad = firstBad || name; }

      var mobileOk = validMobile(mobile.value);
      setError("mobile", mobile, !mobileOk);
      if (!mobileOk) { ok = false; firstBad = firstBad || mobile; }

      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      setError("email", email, !emailOk);
      if (!emailOk) { ok = false; firstBad = firstBad || email; }

      var consentOk = consent.checked;
      setError("consent", consent, !consentOk);
      if (!consentOk) { ok = false; firstBad = firstBad || consent; }

      if (firstBad) firstBad.focus();
      return ok;
    }

    // Clear a field's error as soon as the visitor fixes it
    $all("input", form).forEach(function (input) {
      input.addEventListener("input", function () {
        var key = input.name || input.id;
        var map = { name: "name", mobile: "mobile", email: "email", consent: "consent", investing: "investing" };
        if (map[key]) {
          if (key === "investing") setError(key, null, false);
          else setError(map[key], input, false);
        }
      });
    });

    $all("[data-next]", form).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var step = parseInt(btn.closest(".gform__step").getAttribute("data-step"), 10);
        if (step === 2 && !validateStep2()) return;
        track("enquiry_step_completed", { step: step });
        showStep(step + 1);
      });
    });

    $all("[data-back]", form).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var step = parseInt(btn.closest(".gform__step").getAttribute("data-step"), 10);
        showStep(step - 1);
      });
    });

    function payload() {
      var investingInput = $('input[name="investing"]:checked', form);
      return {
        selectedGoal: state.goal ? GOALS[state.goal].title : null,
        goalBrief: state.goal ? Object.assign({ summary: goalSummary() }, answersFor(state.goal)) : null,
        topics: $all('input[name="topics"]:checked', form).map(function (cb) { return cb.value; }),
        currentlyInvesting: investingInput ? investingInput.value : "",
        name: $("#f-name", form).value.trim(),
        mobile: $("#f-mobile", form).value.trim(),
        email: $("#f-email", form).value.trim(),
        consent: $("#f-consent", form).checked,
        source: "tirtha-website",
        page: "/",
        submittedAt: new Date().toISOString()
      };
    }

    function showFailure() {
      if (failureBox) failureBox.hidden = false;
      if (status) status.textContent = "";
      if (submitBtn) { submitBtn.disabled = false; }
      if (submitLabel) submitLabel.textContent = "Request Free Guidance";
      submitting = false;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitting) return;
      if (!validateStep3()) return;

      submitting = true;
      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) submitLabel.textContent = "Submitting...";
      if (status) status.textContent = "Submitting your enquiry...";
      track("enquiry_submitted", { topics: payload().topics.length });

      if (!LEAD_ENDPOINT) {
        // No endpoint configured — be honest: show the failure state with
        // direct contact details instead of faking a success.
        showFailure();
        return;
      }

      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 15000);

      fetch(LEAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
        signal: controller.signal
      }).then(function (res) {
        clearTimeout(timer);
        if (res.ok) {
          if (form) form.hidden = true;
          if (failureBox) failureBox.hidden = true;
          if (successBox) {
            successBox.hidden = false;
            var h = $("h3", successBox);
            if (h) h.focus && h.focus();
          }
          if (status) status.textContent = "Your enquiry has been received.";
          submitting = false;
        } else {
          showFailure();
        }
      }).catch(function () {
        clearTimeout(timer);
        showFailure();
      });
    });

    var retry = $("[data-retry]");
    if (retry) {
      retry.addEventListener("click", function () {
        if (failureBox) failureBox.hidden = true;
        if (submitBtn) submitBtn.disabled = false;
        if (submitLabel) submitLabel.textContent = "Request Free Guidance";
        submitting = false;
        var legend = $('fieldset[data-step="3"] .gform__q', form);
        if (legend) legend.focus();
      });
    }

    // Success heading focusable for keyboard users
    if (successBox) {
      var sh = $("h3", successBox);
      if (sh) { sh.setAttribute("tabindex", "-1"); }
    }

    setProgress(1);
  }

  /* ------------------------------------------------------------------
     Mobile sticky CTA
     ------------------------------------------------------------------ */
  var stickyCta = $("[data-sticky-cta]");
  if (stickyCta && "IntersectionObserver" in window) {
    stickyCta.hidden = false;
    var heroEl = $("#hero");
    var enquireEl = $("#enquire");
    var footerEl = $("#footer");
    var visible = { hero: true, enquire: false, footer: false };

    function updateSticky() {
      var show = !visible.hero && !visible.enquire && !visible.footer;
      stickyCta.classList.toggle("is-visible", show);
    }

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible.hero = entry.isIntersecting; });
      updateSticky();
    }, { threshold: 0.08 }).observe(heroEl);

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible.enquire = entry.intersectionRatio >= 0.3; });
      updateSticky();
    }, { threshold: [0, 0.3, 0.6] }).observe(enquireEl);

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible.footer = entry.isIntersecting; });
      updateSticky();
    }, { threshold: 0 }).observe(footerEl);
  }
})();
