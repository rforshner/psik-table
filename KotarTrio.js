// ==UserScript==
// @name         Kotar Viewer: Copy tools trio (bookid prefix)
// @namespace    kotar-copy-tools
// @version      1.3
// @description  שלושה כפתורים משמאל: העתק קטע קוד, העתק ID, העתק שם הספר. בכפתור "העתק קטע קוד" מתווסף קו ראשון bookid=<ID>
// @match        https://kotar.cet.ac.il/KotarApp/Viewer.aspx*
// @match        https://school-kotar-cet-ac-il.mgs.dyellin.ac.il/*
// @run-at       document-idle
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      kotar.cet.ac.il
// ==/UserScript==

(function () {
  "use strict";

  // ===== UI =====
  const wrap = document.createElement("div");
  wrap.id = "kotarCopyToolsWrap";
  document.body.appendChild(wrap);

  GM_addStyle(`
    #kotarCopyToolsWrap {
      position: fixed; left: 12px; top: 50%; transform: translateY(-50%);
      z-index: 999999; display: flex; flex-direction: column; gap: 8px;
    }
    .kotarBtn {
      padding: 10px 14px; background: #1f2937; color: #fff;
      border: none; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25); opacity: 0.92;
    }
    .kotarBtn:hover { opacity: 1 }
    #kotarToast {
      position: fixed; left: 12px; top: calc(50% + 80px); transform: translateY(-50%);
      z-index: 1000000; padding: 8px 12px; background: #10b981; color: #fff;
      border-radius: 8px; font-size: 13px; font-family: inherit; display: none;
    }
  `);

  const btn1 = document.createElement("button");
  btn1.className = "kotarBtn";
  btn1.textContent = "העתק קטע קוד";
  const btn2 = document.createElement("button");
  btn2.className = "kotarBtn";
  btn2.textContent = "העתק ID";
  const btn3 = document.createElement("button");
  btn3.className = "kotarBtn";
  btn3.textContent = "העתק שם הספר";

  wrap.append(btn1, btn2, btn3);

  const toast = document.createElement("div");
  toast.id = "kotarToast";
  document.body.appendChild(toast);
  function showToast(msg, ok = true) {
    toast.textContent = msg;
    toast.style.background = ok ? "#10b981" : "#ef4444";
    toast.style.display = "block";
    setTimeout(() => (toast.style.display = "none"), 2200);
  }

  // ===== Helper: current nBookID from URL =====
  function getCurrentBookId() {
    try {
      const u = new URL(location.href);
      return u.searchParams.get("nBookID") || "";
    } catch {
      const m = /[?&]nBookID=([^&#]+)/.exec(location.href);
      return m ? decodeURIComponent(m[1]) : "";
    }
  }

  // ===== Button 1: העתק קטע קוד, עם prefixed bookid=<ID> =====
  const startRe = /<script[^>]*>\s*var\s+cartlink\s*=\s*['"]\/KotarApp\/Shop\/AddToCart\.aspx\?site=default['"];\s*var\s+oPagesInfo\s*=/i;
  const endRe = /<\/script>\s*<script\s+src=["']Shop\/JS\/Cart\.js["']><\/script>\s*<script[^>]*>\s*var\s+AppSettingsIsEnableCetEvent\s*=\s*['"]true['"];\s*var\s+AppSettingsIsEnableDebounceAjax\s*=\s*['"]true['"];\s*var\s+AppSettingsIsEnableMobile\s*=\s*['"]true['"];\s*<\/script>/i;

  async function copyRequestedBlock() {
    try {
      const html = document.documentElement.outerHTML;
      const s = startRe.exec(html);
      if (!s) { showToast("לא נמצאה תחילת המקטע", false); return; }
      const tail = html.slice(s.index);
      const e = endRe.exec(tail);
      if (!e) { showToast("לא נמצא סוף המקטע", false); return; }
      const extracted = tail.slice(0, e.index + e[0].length);

      const bookId = getCurrentBookId();
      if (!bookId) { showToast("לא נמצא ID בכתובת", false); return; }

      const combined = `bookid=${bookId}\n` + extracted;

      await copyText(combined);
      showToast("הועתק קטע הקוד");
    } catch (err) {
      console.error(err);
      showToast("שגיאה בהעתקת קטע הקוד", false);
    }
  }

  // ===== Button 2: העתק ID =====
  async function copyIdFromUrl() {
    const id = getCurrentBookId();
    if (!id) { showToast("לא נמצא ID בכתובת", false); return; }
    await copyText(id);
    showToast("הועתק ID");
  }

  // ===== Button 3: העתק שם הספר =====
  function sanitizeTitle(t) {
    let title = (t || "").trim();
    title = title.replace(/^קראו\s+בכותר\s*-\s*/u, "");
    title = title.replace(/:/g, "-");
    title = title.replace(/[?!]/g, "");
    title = title.replace(/\s*-\s*/g, " - ").replace(/\s{2,}/g, " ").trim();
    title = title.replace(/"/g, "'");
    return title;
  }

  function fetchTitleByBookId(bookId) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: `https://kotar.cet.ac.il/KotarApp/Viewer.aspx?nBookID=${encodeURIComponent(bookId)}`,
        timeout: 20000,
        onload: (res) => {
          if (res.status < 200 || res.status >= 300) {
            reject(new Error("סטטוס " + res.status));
            return;
          }
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(res.responseText, "text/html");
            let title = doc.querySelector("title")?.textContent || "";
            title = sanitizeTitle(title);
            if (!title) {
              reject(new Error("לא נמצאה כותרת"));
              return;
            }
            resolve(title);
          } catch (e) {
            reject(e);
          }
        },
        onerror: () => reject(new Error("שגיאה בשליפת הדף")),
        ontimeout: () => reject(new Error("פג תוקף הבקשה")),
      });
    });
  }

  async function copyBookTitle() {
    try {
      const bookId = getCurrentBookId();
      if (!bookId) { showToast("לא נמצא ID בכתובת", false); return; }
      const title = await fetchTitleByBookId(bookId);
      await copyText(title);
      showToast("הועתק שם ספר");
    } catch (err) {
      console.error(err);
      showToast("שגיאה בהעתקת שם ספר", false);
    }
  }

  // ===== Clipboard helper =====
  async function copyText(text) {
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {}
    if (!copied && typeof GM_setClipboard === "function") {
      GM_setClipboard(text, { type: "text", mimetype: "text/plain" });
      copied = true;
    }
    if (!copied) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  // ===== Events =====
  btn1.addEventListener("click", copyRequestedBlock);
  btn2.addEventListener("click", copyIdFromUrl);
  btn3.addEventListener("click", copyBookTitle);
})();
