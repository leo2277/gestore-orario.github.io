(function () {
  "use strict";

  var cfg = OrarioStorage.getConfig();
  if (!cfg || !cfg.projectName) {
    window.location.href = "index.html";
    return;
  }
  document.title = cfg.projectName + " · Orario";

  var DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  var DAY_FULL = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  var PALETTE = ["#3562E9", "#E8604C", "#2F9E6E", "#E8A23C", "#8B5CF6", "#16A3A3", "#E2568B", "#7A8B3C", "#5B6B8C", "#B4562E"];

  var state = {
    lessons: [],
    activeDays: [true, true, true, true, true, true],
    subjectColors: {},
  };

  var editingId = null;
  var lastFocusedEl = null;
  var lastSha = null;
  var syncTimer = null;
  var ghConfigured = OrarioStorage.isGithubConfigured(cfg);

  // ---------------- sync status ----------------
  function setSyncStatus(text, kind) {
    var pill = document.getElementById("sync-pill");
    if (!pill) return;
    pill.className = "sync-pill" + (kind ? " " + kind : "");
    pill.querySelector(".label").textContent = text;
  }

  function persist() {
    OrarioStorage.saveLocal(cfg.projectName, state);
    if (!ghConfigured) {
      setSyncStatus("Salvato in locale", "ok");
      return;
    }
    setSyncStatus("Salvataggio…", "busy");
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      OrarioStorage.ghSave(cfg, state, lastSha)
        .then(function (res) {
          lastSha = res.content.sha;
          setSyncStatus("Sincronizzato", "ok");
        })
        .catch(function (err) {
          console.error(err);
          setSyncStatus("Errore di sync — salvato in locale", "error");
        });
    }, 1200);
  }

  function bootLoad() {
    var local = OrarioStorage.loadLocal(cfg.projectName);
    if (local) {
      state.lessons = local.lessons || [];
      state.activeDays = local.activeDays || state.activeDays;
      state.subjectColors = local.subjectColors || {};
    }
    renderAll();

    if (ghConfigured) {
      setSyncStatus("Sincronizzazione…", "busy");
      OrarioStorage.ghLoad(cfg)
        .then(function (res) {
          if (res) {
            state.lessons = res.data.lessons || [];
            state.activeDays = res.data.activeDays || state.activeDays;
            state.subjectColors = res.data.subjectColors || {};
            lastSha = res.sha;
            renderAll();
            setSyncStatus("Sincronizzato", "ok");
          } else {
            setSyncStatus("Pronto (nuovo su GitHub)", "ok");
          }
        })
        .catch(function (err) {
          console.error(err);
          setSyncStatus("Offline — solo locale", "warn");
        });
    } else {
      setSyncStatus("Solo locale", null);
    }
  }

  // ---------------- helpers ----------------
  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function minToHHMM(m) {
    var h = Math.floor(m / 60),
      mm = m % 60;
    return pad(h) + ":" + pad(mm);
  }
  function hhmmToMin(s) {
    var parts = s.split(":");
    return +parts[0] * 60 + +parts[1];
  }
  function uid() {
    return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function colorForSubject(subject) {
    var key = subject.trim().toLowerCase();
    if (state.subjectColors[key]) return state.subjectColors[key];
    var used = Object.values(state.subjectColors);
    var next = PALETTE.find(function (c) { return used.indexOf(c) === -1; }) || PALETTE[used.length % PALETTE.length];
    state.subjectColors[key] = next;
    return next;
  }

  function activeDayIndices() {
    var out = [];
    for (var i = 0; i < 6; i++) if (state.activeDays[i]) out.push(i);
    return out;
  }

  // ---------------- parser ----------------
  var DAY_REGEX = /\b(lun(?:ed[iì])?|mar(?:ted[iì])?|mer(?:coled[iì])?|gio(?:ved[iì])?|ven(?:erd[iì])?|sab(?:ato)?)[a-zàèìòù]*\b/i;
  var DAY_KEY_MAP = { lun: 0, mar: 1, mer: 2, gio: 3, ven: 4, sab: 5 };
  var TIME_REGEX = /(\d{1,2})[:.,]?(\d{2})?\s*(?:-|–|—|a|\/)\s*(\d{1,2})[:.,]?(\d{2})?/i;
  var ROOM_REGEX = /^(aula|lab(?:oratorio)?)\b\.?\s*/i;
  var TEACHER_REGEX = /^prof(?:\.|essor[ei]|essa)?\.?\s*/i;

  function parseLine(raw) {
    var line = raw.trim();
    if (!line) return null;

    var dm = line.match(DAY_REGEX);
    var day = null;
    if (dm) {
      var key = dm[1].slice(0, 3).toLowerCase();
      day = DAY_KEY_MAP[key];
      line = (line.slice(0, dm.index) + " " + line.slice(dm.index + dm[0].length)).trim();
    }

    var tm = line.match(TIME_REGEX);
    var start = null, end = null;
    if (tm) {
      var h1 = +tm[1], m1 = tm[2] ? +tm[2] : 0;
      var h2 = +tm[3], m2 = tm[4] ? +tm[4] : 0;
      if (h1 <= 23 && h2 <= 23 && m1 <= 59 && m2 <= 59) {
        start = h1 * 60 + m1;
        end = h2 * 60 + m2;
      }
      line = (line.slice(0, tm.index) + " " + line.slice(tm.index + tm[0].length)).trim();
    }

    var rest = line.replace(/^[\s\-–—,;|.]+|[\s\-–—,;|.]+$/g, "");
    var tokens = rest.split(/\s*[-–—,;|]\s*/).map(function (t) { return t.trim(); }).filter(Boolean);

    var subject = null, teacher = null, room = null;
    var remaining = [];
    tokens.forEach(function (tok) {
      if (ROOM_REGEX.test(tok) && room === null) {
        room = tok;
      } else if (TEACHER_REGEX.test(tok) && teacher === null) {
        teacher = tok.replace(TEACHER_REGEX, "").trim();
      } else {
        remaining.push(tok);
      }
    });
    if (subject === null && remaining.length) subject = remaining.shift();
    if (teacher === null && remaining.length) teacher = remaining.shift();
    if (room === null && remaining.length) room = remaining.shift();

    var reasons = [];
    if (day === null) reasons.push("giorno non riconosciuto");
    if (start === null) reasons.push("orario non riconosciuto");
    if (!subject) reasons.push("materia mancante");

    if (reasons.length) return { ok: false, raw: raw.trim(), reasons: reasons };
    if (end === null || end <= start) end = start + 60;

    return { ok: true, day: day, start: start, end: end, subject: subject, teacher: teacher || "", room: room || "", raw: raw.trim() };
  }

  function parseText(text) {
    var lines = text.split(/\r?\n/);
    var good = [], bad = [];
    lines.forEach(function (l) {
      if (!l.trim()) return;
      var r = parseLine(l);
      if (!r) return;
      if (r.ok) good.push(r); else bad.push(r);
    });
    return { good: good, bad: bad };
  }

  // ---------------- rendering ----------------
  function computeDayBounds() {
    var minStart = 8 * 60, maxEnd = 14 * 60;
    state.lessons.forEach(function (l) {
      if (l.start < minStart) minStart = l.start;
      if (l.end > maxEnd) maxEnd = l.end;
    });
    minStart = Math.floor(minStart / 30) * 30;
    maxEnd = Math.ceil(maxEnd / 30) * 30;
    return { start: minStart, end: maxEnd };
  }

  function todayIndex() {
    var d = new Date().getDay();
    return d === 0 ? -1 : d - 1;
  }

  function renderAll() {
    var hasLessons = state.lessons.length > 0;
    document.getElementById("empty-state").hidden = hasLessons;
    document.getElementById("grid-area").hidden = !hasLessons;
    document.getElementById("week-count-label").textContent = hasLessons
      ? state.lessons.length + (state.lessons.length === 1 ? " lezione" : " lezioni")
      : "";
    if (hasLessons) renderGrid();
    renderLegend();
  }

  function renderLegend() {
    var el = document.getElementById("legend");
    var subjects = Object.keys(state.subjectColors);
    if (!subjects.length) { el.innerHTML = ""; return; }
    el.innerHTML = subjects
      .map(function (s) {
        var color = state.subjectColors[s];
        var label = s.charAt(0).toUpperCase() + s.slice(1);
        return '<span class="legend-item"><span class="legend-dot" style="background:' + color + '"></span>' + escapeHtml(label) + "</span>";
      })
      .join("");
  }

  var HOURPX = 56;

  function renderGrid() {
    var grid = document.getElementById("grid");
    var days = activeDayIndices();
    if (!days.length) days = [0, 1, 2, 3, 4];
    var bounds = computeDayBounds();
    var totalMin = bounds.end - bounds.start;
    var totalPx = (totalMin / 60) * HOURPX;

    grid.style.setProperty("--ndays", days.length);
    grid.style.setProperty("--hourpx", HOURPX + "px");
    grid.innerHTML = "";

    var corner = document.createElement("div");
    corner.className = "corner-head";
    grid.appendChild(corner);

    var today = todayIndex();

    days.forEach(function (d) {
      var head = document.createElement("div");
      head.className = "day-head" + (d === today ? " today" : "");
      head.innerHTML = '<div class="name">' + DAY_NAMES[d] + '</div><div class="dot-today"></div>';
      grid.appendChild(head);
    });

    var axis = document.createElement("div");
    axis.className = "time-axis";
    axis.style.height = totalPx + "px";
    for (var m = bounds.start; m <= bounds.end; m += 60) {
      var tick = document.createElement("div");
      tick.className = "tick";
      tick.style.top = ((m - bounds.start) / 60) * HOURPX + "px";
      tick.textContent = pad(Math.floor(m / 60)) + ":00";
      axis.appendChild(tick);
    }
    grid.appendChild(axis);

    days.forEach(function (d) {
      var col = document.createElement("div");
      col.className = "day-col" + (d === today ? " today" : "");
      col.style.height = totalPx + "px";
      col.dataset.day = d;

      col.addEventListener("click", function (ev) {
        if (ev.target !== col) return;
        var rect = col.getBoundingClientRect();
        var y = ev.clientY - rect.top;
        var minutes = bounds.start + Math.round(((y / totalPx) * totalMin) / 15) * 15;
        openEditSheet(null, { day: d, start: minutes, end: minutes + 60 });
      });

      var dayLessons = state.lessons.filter(function (l) { return l.day === d; });
      dayLessons.forEach(function (l) {
        var top = ((l.start - bounds.start) / totalMin) * totalPx;
        var height = ((l.end - l.start) / totalMin) * totalPx;
        var block = document.createElement("div");
        block.className = "lesson-block" + (height < 46 ? " compact" : "");
        block.style.top = top + "px";
        block.style.height = Math.max(height, 26) + "px";
        block.style.background = l.color || colorForSubject(l.subject);
        block.innerHTML =
          '<div class="subj">' + escapeHtml(l.subject) + "</div>" +
          '<div class="meta">' + minToHHMM(l.start) + "–" + minToHHMM(l.end) +
          (l.teacher ? " · " + escapeHtml(l.teacher) : "") +
          (l.room ? " · " + escapeHtml(l.room) : "") +
          "</div>" +
          (l.topic ? '<div class="topic">' + escapeHtml(l.topic) + "</div>" : "");
        block.addEventListener("click", function (ev) {
          ev.stopPropagation();
          openEditSheet(l.id);
        });
        col.appendChild(block);
      });

      grid.appendChild(col);
    });
  }

  // ---------------- sheets: generic open/close ----------------
  function openSheet(name) {
    lastFocusedEl = document.activeElement;
    document.getElementById("scrim").classList.add("show");
    document.getElementById("sheet-" + name).classList.add("show");
  }
  function closeSheet(name) {
    document.getElementById("scrim").classList.remove("show");
    document.getElementById("sheet-" + name).classList.remove("show");
    if (lastFocusedEl && lastFocusedEl.focus) lastFocusedEl.focus();
  }
  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () { closeSheet(btn.dataset.close); });
  });
  document.getElementById("scrim").addEventListener("click", function () {
    ["import", "edit", "settings"].forEach(closeSheet);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") ["import", "edit", "settings"].forEach(closeSheet);
  });

  // ---------------- edit sheet ----------------
  function buildDayToggleRow(container, selectedSet, multi, onChange) {
    container.innerHTML = "";
    DAY_NAMES.forEach(function (name, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "day-toggle" + (selectedSet.has(i) ? " on" : "");
      b.textContent = name;
      b.addEventListener("click", function () {
        if (multi) {
          if (selectedSet.has(i)) selectedSet.delete(i); else selectedSet.add(i);
        } else {
          selectedSet.clear();
          selectedSet.add(i);
        }
        buildDayToggleRow(container, selectedSet, multi, onChange);
        if (onChange) onChange(selectedSet);
      });
      container.appendChild(b);
    });
  }

  var editDaySet = new Set([0]);

  function refreshSubjectList() {
    var dl = document.getElementById("subject-list");
    var names = Object.keys(state.subjectColors).map(function (k) { return k.charAt(0).toUpperCase() + k.slice(1); });
    dl.innerHTML = names.map(function (n) { return '<option value="' + escapeHtml(n) + '">'; }).join("");
  }

  function renderSwatches(selectedColor) {
    var wrap = document.getElementById("f-swatches");
    wrap.innerHTML = "";
    PALETTE.forEach(function (c) {
      var s = document.createElement("div");
      s.className = "swatch" + (c === selectedColor ? " selected" : "");
      s.style.background = c;
      s.dataset.color = c;
      s.addEventListener("click", function () {
        wrap.dataset.chosen = c;
        Array.from(wrap.children).forEach(function (ch) { ch.classList.toggle("selected", ch.dataset.color === c); });
      });
      wrap.appendChild(s);
    });
    wrap.dataset.chosen = selectedColor || "";
  }

  function openEditSheet(id, prefill) {
    editingId = id;
    var l = id ? state.lessons.find(function (x) { return x.id === id; }) : null;

    document.getElementById("edit-title").textContent = l ? "Modifica lezione" : "Nuova lezione";
    document.getElementById("btnDelete").style.display = l ? "" : "none";

    editDaySet = new Set([l ? l.day : prefill ? prefill.day : 0]);
    buildDayToggleRow(document.getElementById("edit-day-row"), editDaySet, false);

    document.getElementById("f-start").value = minToHHMM(l ? l.start : prefill ? prefill.start : 8 * 60);
    document.getElementById("f-end").value = minToHHMM(l ? l.end : prefill ? prefill.end : 9 * 60);
    document.getElementById("f-subject").value = l ? l.subject : "";
    document.getElementById("f-teacher").value = l ? l.teacher : "";
    document.getElementById("f-room").value = l ? l.room : "";
    document.getElementById("f-topic").value = l ? l.topic || "" : "";

    refreshSubjectList();
    renderSwatches(l ? l.color || colorForSubject(l.subject) : "");

    openSheet("edit");
    document.getElementById("f-subject").focus();
  }

  document.getElementById("btnSaveLesson").addEventListener("click", function () {
    var subject = document.getElementById("f-subject").value.trim();
    if (!subject) { document.getElementById("f-subject").focus(); return; }
    var start = hhmmToMin(document.getElementById("f-start").value || "08:00");
    var end = hhmmToMin(document.getElementById("f-end").value || "09:00");
    if (end <= start) end = start + 30;
    var day = editDaySet.size ? Array.from(editDaySet)[0] : 0;
    var chosen = document.getElementById("f-swatches").dataset.chosen;
    var color = chosen || colorForSubject(subject);
    state.subjectColors[subject.trim().toLowerCase()] = color;

    var teacher = document.getElementById("f-teacher").value.trim();
    var room = document.getElementById("f-room").value.trim();
    var topic = document.getElementById("f-topic").value.trim();

    if (editingId) {
      var l = state.lessons.find(function (x) { return x.id === editingId; });
      Object.assign(l, { day: day, start: start, end: end, subject: subject, teacher: teacher, room: room, topic: topic, color: color });
    } else {
      state.lessons.push({ id: uid(), day: day, start: start, end: end, subject: subject, teacher: teacher, room: room, topic: topic, color: color });
    }
    persist();
    renderAll();
    closeSheet("edit");
  });

  document.getElementById("btnDelete").addEventListener("click", function () {
    if (!editingId) return;
    state.lessons = state.lessons.filter(function (x) { return x.id !== editingId; });
    persist();
    renderAll();
    closeSheet("edit");
  });

  // ---------------- import sheet ----------------
  var EXAMPLE_TEXT =
    "Lunedì 08:00-09:00 Matematica - Rossi - Aula 3\n" +
    "Lunedì 09:00-10:00 Italiano Bianchi\n" +
    "Martedì 10:00-11:30 Inglese - Prof. Verdi - Aula 5\n" +
    "Mercoledì 8-9 Storia\n" +
    "Giovedì 11:00-12:00 Scienze - Prof.ssa Neri - Lab 2\n" +
    "Venerdì 09:00-10:00 Matematica - Rossi - Aula 3";

  document.getElementById("example-format").textContent = EXAMPLE_TEXT.split("\n").slice(0, 3).join("\n") + "\n...";

  var pendingImport = [];

  function renderImportPreview(result) {
    var box = document.getElementById("import-preview");
    pendingImport = result.good;
    var html = "";
    if (result.good.length) {
      html += '<div class="section-label">Riconosciute (' + result.good.length + ')</div><div class="preview-list">';
      html += result.good
        .map(function (g) {
          var color = colorForSubject(g.subject);
          return (
            '<div class="preview-item"><span class="dot" style="background:' + color + '"></span>' +
            '<span class="txt"><b>' + escapeHtml(g.subject) + "</b> · " + DAY_NAMES[g.day] + " " + minToHHMM(g.start) + "–" + minToHHMM(g.end) +
            (g.teacher ? " · " + escapeHtml(g.teacher) : "") +
            (g.room ? " · " + escapeHtml(g.room) : "") +
            "</span></div>"
          );
        })
        .join("");
      html += "</div>";
    }
    if (result.bad.length) {
      html += '<div class="section-label">Da sistemare a mano (' + result.bad.length + ')</div><div class="preview-list">';
      html += result.bad
        .map(function (b) {
          return (
            '<div class="preview-item bad"><span class="dot" style="background:#E24C4C"></span>' +
            '<span class="txt">"' + escapeHtml(b.raw) + '" — ' + b.reasons.join(", ") + "</span></div>"
          );
        })
        .join("");
      html += "</div>";
    }
    box.innerHTML = html;
    document.getElementById("btnConfirmImport").disabled = result.good.length === 0;
  }

  document.getElementById("btnParse").addEventListener("click", function () {
    var text = document.getElementById("import-text").value;
    renderImportPreview(parseText(text));
  });

  document.getElementById("btnFillExample").addEventListener("click", function () {
    document.getElementById("import-text").value = EXAMPLE_TEXT;
  });

  document.getElementById("btnConfirmImport").addEventListener("click", function () {
    pendingImport.forEach(function (g) {
      var color = colorForSubject(g.subject);
      state.lessons.push({ id: uid(), day: g.day, start: g.start, end: g.end, subject: g.subject, teacher: g.teacher, room: g.room, topic: "", color: color });
    });
    pendingImport = [];
    document.getElementById("import-text").value = "";
    document.getElementById("import-preview").innerHTML = "";
    document.getElementById("btnConfirmImport").disabled = true;
    persist();
    renderAll();
    closeSheet("import");
  });

  // ---------------- settings sheet ----------------
  function buildSettingsDays() {
    var set = new Set(activeDayIndices());
    buildDayToggleRow(document.getElementById("settings-day-row"), set, true, function (s) {
      state.activeDays = [0, 1, 2, 3, 4, 5].map(function (i) { return s.has(i); });
      persist();
      renderAll();
    });
  }

  document.getElementById("btnResetAsk").addEventListener("click", function () {
    document.getElementById("reset-confirm").hidden = false;
  });
  document.getElementById("btnResetCancel").addEventListener("click", function () {
    document.getElementById("reset-confirm").hidden = true;
  });
  document.getElementById("btnResetConfirm").addEventListener("click", function () {
    state.lessons = [];
    state.subjectColors = {};
    persist();
    renderAll();
    document.getElementById("reset-confirm").hidden = true;
    closeSheet("settings");
  });

  document.getElementById("btnSyncNow").addEventListener("click", function () {
    if (!ghConfigured) return;
    setSyncStatus("Sincronizzazione…", "busy");
    OrarioStorage.ghSave(cfg, state, lastSha)
      .then(function (res) {
        lastSha = res.content.sha;
        setSyncStatus("Sincronizzato", "ok");
      })
      .catch(function (err) {
        console.error(err);
        setSyncStatus("Errore di sync", "error");
      });
  });

  document.getElementById("btnChangeProject").addEventListener("click", function () {
    window.location.href = "index.html";
  });

  // ---------------- export: PDF (stampa) ----------------
  function prepareAndPrint() {
    var days = activeDayIndices();
    var html = "<h1>" + escapeHtml(cfg.projectName) + " — Orario settimanale</h1>";
    days.forEach(function (d) {
      var dayLessons = state.lessons.filter(function (l) { return l.day === d; }).sort(function (a, b) { return a.start - b.start; });
      if (!dayLessons.length) return;
      html += "<h2>" + DAY_FULL[d] + "</h2><table class=\"print-table\"><thead><tr><th>Orario</th><th>Materia</th><th>Docente</th><th>Aula</th><th>Argomento</th></tr></thead><tbody>";
      dayLessons.forEach(function (l) {
        html += "<tr><td>" + minToHHMM(l.start) + "–" + minToHHMM(l.end) + "</td><td>" + escapeHtml(l.subject) + "</td><td>" + escapeHtml(l.teacher || "") + "</td><td>" + escapeHtml(l.room || "") + "</td><td>" + escapeHtml(l.topic || "") + "</td></tr>";
      });
      html += "</tbody></table>";
    });
    document.getElementById("print-area").innerHTML = html;
    window.print();
  }
  document.getElementById("btnExportPdf").addEventListener("click", prepareAndPrint);

  // ---------------- export: Word (.doc leggibile da Word) ----------------
  function exportWord() {
    var days = activeDayIndices();
    var bodyHtml = '<h1 style="font-family:Calibri,Arial,sans-serif;">' + escapeHtml(cfg.projectName) + " — Orario settimanale</h1>";
    days.forEach(function (d) {
      var dayLessons = state.lessons.filter(function (l) { return l.day === d; }).sort(function (a, b) { return a.start - b.start; });
      if (!dayLessons.length) return;
      bodyHtml += '<h2 style="font-family:Calibri,Arial,sans-serif;">' + DAY_FULL[d] + "</h2>";
      bodyHtml += '<table style="border-collapse:collapse;width:100%;font-family:Calibri,Arial,sans-serif;font-size:11pt;" border="1" cellspacing="0" cellpadding="6">';
      bodyHtml += '<tr style="background:#3562E9;color:#ffffff;"><th>Orario</th><th>Materia</th><th>Docente</th><th>Aula</th><th>Argomento</th></tr>';
      dayLessons.forEach(function (l) {
        bodyHtml += "<tr><td>" + minToHHMM(l.start) + "–" + minToHHMM(l.end) + "</td><td>" + escapeHtml(l.subject) + "</td><td>" + escapeHtml(l.teacher || "") + "</td><td>" + escapeHtml(l.room || "") + "</td><td>" + escapeHtml(l.topic || "") + "</td></tr>";
      });
      bodyHtml += "</table><br/>";
    });
    var docHtml =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
      "<head><meta charset=\"utf-8\"><title>" + escapeHtml(cfg.projectName) + "</title></head><body>" + bodyHtml + "</body></html>";
    var blob = new Blob(["\ufeff", docHtml], { type: "application/msword" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = (cfg.projectName || "orario").replace(/\s+/g, "_") + ".doc";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
  document.getElementById("btnExportWord").addEventListener("click", exportWord);

  // ---------------- top actions ----------------
  document.getElementById("btnImport").addEventListener("click", function () { openSheet("import"); });
  document.getElementById("btnImportEmpty").addEventListener("click", function () { openSheet("import"); });
  document.getElementById("btnAdd").addEventListener("click", function () { openEditSheet(null, { day: 0, start: 8 * 60, end: 9 * 60 }); });
  document.getElementById("btnAddEmpty").addEventListener("click", function () { openEditSheet(null, { day: 0, start: 8 * 60, end: 9 * 60 }); });
  document.getElementById("btnSettings").addEventListener("click", function () { buildSettingsDays(); openSheet("settings"); });

  // ---------------- boot ----------------
  document.getElementById("project-label").textContent = cfg.projectName;
  document.getElementById("btnSyncNow").style.display = ghConfigured ? "" : "none";
  bootLoad();
})();
