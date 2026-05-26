// ==UserScript==
// @name         Ordered Link Downloader with HTML filename prefix
// @namespace    ordered-link-downloader
// @version      1.1
// @description  יוריד את כל <a href> לפי סדר הופעתם עם קידומת שם הקובץ המקורי (ללא .html) + מספר רץ 0000.jpeg וכו'
// @match        file:///*
// @run-at       document-end
// @grant        GM_download
// ==/UserScript==

(function () {
  "use strict";

  // מוציא את שם הקובץ המקורי (לפני .html)
  let baseName = "output";
  try {
    const urlPath = window.location.pathname;
    const lastPart = urlPath.substring(urlPath.lastIndexOf("/") + 1);
    baseName = lastPart.replace(/\.html?$/i, "");
  } catch (e) {
    console.log("לא הצלחתי לחלץ שם קובץ, משתמש ב-output");
  }

  const anchors = Array.from(document.querySelectorAll("a[href]"));
  if (!anchors.length) return;

  // יוצר כפתור להורדה
  const btn = document.createElement("button");
  btn.textContent = "התחל הורדה ממוספרת";
  Object.assign(btn.style, {
    position: "fixed",
    top: "10px",
    left: "10px",
    zIndex: 999999,
    padding: "8px 12px",
    fontFamily: "sans-serif",
    fontSize: "14px",
    cursor: "pointer"
  });
  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.textContent = "מוריד...";
    downloadSequentially(anchors);
  });

  function downloadSequentially(aTags) {
    const urls = aTags
      .map(a => a.getAttribute("href"))
      .filter(href => href && /^https?:\/\//i.test(href));

    let i = 0;

    const next = () => {
      if (i >= urls.length) {
        btn.textContent = `הושלם (${urls.length} קבצים)`;
        return;
      }
      const url = urls[i];
      const filename = `${baseName}_${String(i).padStart(4, "0")}.jpeg`;
      i++;

      GM_download({
        url,
        name: filename,
        onload: () => next(),
        onerror: () => next()
      });
    };

    next();
  }
})();
