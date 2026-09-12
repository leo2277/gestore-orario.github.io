// storage.js — livello di persistenza condiviso tra le pagine.
// "Database" = un file JSON dentro data/<progetto>.json nel repo GitHub stesso,
// letto/scritto direttamente dal browser via API di GitHub. Fallback: localStorage.
window.OrarioStorage = (function () {
  "use strict";

  var CFG_KEY = "orario:config";

  function getConfig() {
    try {
      return JSON.parse(localStorage.getItem(CFG_KEY)) || null;
    } catch (e) {
      return null;
    }
  }
  function setConfig(cfg) {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }
  function clearConfig() {
    localStorage.removeItem(CFG_KEY);
  }

  function isGithubConfigured(cfg) {
    return !!(cfg && cfg.gh && cfg.gh.owner && cfg.gh.repo && cfg.gh.token);
  }

  function dataLocalKey(projectName) {
    return "orario:data:" + projectName;
  }

  function loadLocal(projectName) {
    try {
      var raw = localStorage.getItem(dataLocalKey(projectName));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function saveLocal(projectName, data) {
    localStorage.setItem(dataLocalKey(projectName), JSON.stringify(data));
  }

  // --- base64 unicode-safe helpers (per contenuti con accenti/emoji) ---
  function b64EncodeUnicode(str) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
        return String.fromCharCode("0x" + p1);
      })
    );
  }
  function b64DecodeUnicode(str) {
    return decodeURIComponent(
      atob(str)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
  }

  function ghPath(projectName) {
    return "data/" + encodeURIComponent(projectName) + ".json";
  }
  function ghHeaders(token) {
    return {
      Authorization: "token " + token,
      Accept: "application/vnd.github+json",
    };
  }

  function ghLoad(cfg) {
    var gh = cfg.gh;
    if (!isGithubConfigured(cfg)) return Promise.resolve(null);
    var url =
      "https://api.github.com/repos/" +
      gh.owner +
      "/" +
      gh.repo +
      "/contents/" +
      ghPath(cfg.projectName) +
      "?ref=" +
      encodeURIComponent(gh.branch || "main");
    return fetch(url, { headers: ghHeaders(gh.token) }).then(function (res) {
      if (res.status === 404) return null;
      if (!res.ok)
        return res.text().then(function (t) {
          throw new Error("GitHub GET " + res.status + ": " + t);
        });
      return res.json().then(function (json) {
        var content = b64DecodeUnicode(json.content.replace(/\n/g, ""));
        return { data: JSON.parse(content), sha: json.sha };
      });
    });
  }

  function ghSave(cfg, dataObj, sha) {
    var gh = cfg.gh;
    var url =
      "https://api.github.com/repos/" +
      gh.owner +
      "/" +
      gh.repo +
      "/contents/" +
      ghPath(cfg.projectName);
    var body = {
      message: "Aggiorna orario — " + new Date().toISOString(),
      content: b64EncodeUnicode(JSON.stringify(dataObj, null, 2)),
      branch: gh.branch || "main",
    };
    if (sha) body.sha = sha;
    return fetch(url, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, ghHeaders(gh.token)),
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok)
        return res.json().then(function (e) {
          throw new Error("GitHub PUT " + res.status + ": " + (e.message || ""));
        });
      return res.json();
    });
  }

  return {
    getConfig: getConfig,
    setConfig: setConfig,
    clearConfig: clearConfig,
    isGithubConfigured: isGithubConfigured,
    loadLocal: loadLocal,
    saveLocal: saveLocal,
    ghLoad: ghLoad,
    ghSave: ghSave,
  };
})();
