(() => {
  const PASS_KEY = "pooltime_admin_ok";
  // Change this password before giving to client
  const PASSWORD = "pooltime2026";

  const $ = (id) => document.getElementById(id);
  let data = null;

  const gate = $("gate");
  const app = $("app");

  function authed() {
    return sessionStorage.getItem(PASS_KEY) === "1";
  }

  function showApp() {
    gate.hidden = true;
    app.hidden = false;
    load();
  }

  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("password").value === PASSWORD) {
      sessionStorage.setItem(PASS_KEY, "1");
      $("login-err").hidden = true;
      showApp();
    } else {
      $("login-err").hidden = false;
    }
  });

  $("logout").addEventListener("click", () => {
    sessionStorage.removeItem(PASS_KEY);
    location.reload();
  });

  async function load() {
    const res = await fetch("../content.json?ts=" + Date.now());
    data = await res.json();
    fill();
  }

  function fill() {
    $("club-address").value = data.club.address || "";
    $("club-hours").value = data.club.hours || "";
    $("club-phone").value = data.club.phone || "";
    $("club-phone-raw").value = data.club.phoneRaw || "";
    $("club-wa").value = data.club.whatsapp || "";
    $("club-max").value = data.club.max || "";
    $("club-tagline").value = data.club.tagline || "";
    $("billiard-price").value = data.billiard?.price ?? 600;
    $("billiard-note").value = data.billiard?.note || "";
    $("promo-enabled").checked = !!data.promo?.enabled;
    $("promo-text").value = data.promo?.text || "";
    $("notice").value = data.notice || "";
    renderPromoPreview();
    renderTables();
    renderGallery();
    renderMenu();
  }

  function renderPromoPreview() {
    const box = $("promo-preview");
    if (data.promo?.image) {
      box.innerHTML = `<img src="../${data.promo.image}" alt="promo" />`;
    } else {
      box.innerHTML = "<p style='color:#9eaea3;margin:0'>Фото не загружено</p>";
    }
  }

  function apiUrl(path) {
    // /admin/ → /api/... ; /pooltime/admin/ → /pooltime/api/...
    const base = location.pathname.replace(/\/admin\/?$/, "") || "";
    return `${base}${path}`;
  }

  function isStaticHost() {
    return /github\.io$/i.test(location.hostname) || location.protocol === "file:";
  }

  async function upload(file, folder) {
    if (isStaticHost()) {
      throw new Error("На GitHub Pages загрузка не работает. Открой админку через http://127.0.0.1:5560/admin/");
    }
    const fd = new FormData();
    fd.append("folder", folder);
    fd.append("file", file);
    const res = await fetch(apiUrl("/api/upload"), { method: "POST", body: fd });
    let json = null;
    try { json = await res.json(); } catch { /* ignore */ }
    if (!res.ok || !json?.path) {
      throw new Error(json?.error || `ошибка ${res.status}`);
    }
    return json.path;
  }

  function renderTables() {
    const root = $("tables-editor");
    root.innerHTML = (data.tables || []).map((t, i) => `
      <div class="item-card" data-table="${i}">
        <h3>${escapeHtml(t.title)}</h3>
        <label>Название<input data-field="title" value="${escapeAttr(t.title)}" /></label>
        <label>Фото<input type="file" accept="image/*" data-upload="table" /></label>
        <div class="preview">${t.image ? `<img src="../${escapeAttr(t.image)}" alt="" />` : "Нет фото"}</div>
      </div>
    `).join("");

    root.querySelectorAll("[data-table]").forEach((card) => {
      const i = Number(card.dataset.table);
      card.querySelector('[data-field="title"]').addEventListener("input", (e) => {
        data.tables[i].title = e.target.value;
      });
      card.querySelector("[data-upload]").addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          data.tables[i].image = await upload(file, "tables");
          renderTables();
          status("Фото стола загружено", true);
        } catch (err) {
          status("Ошибка загрузки: " + (err.message || "запустите py serve.py"), false);
        }
      });
    });
  }

  function renderGallery() {
    const root = $("gallery-editor");
    root.innerHTML = (data.gallery || []).map((g, i) => `
      <div class="item-card" data-gallery="${i}">
        <h3>${escapeHtml(g.title)} · ${g.type === "video" ? "видео" : "фото"}</h3>
        <label>Название<input data-field="title" value="${escapeAttr(g.title)}" /></label>
        <label>Файл<input type="file" accept="${g.type === "video" ? "video/*" : "image/*"}" data-upload="gallery" /></label>
        <div class="preview">${g.image ? (g.type === "video" ? `<video src="../${escapeAttr(g.image)}" controls style="width:100%;border-radius:12px;max-height:180px"></video>` : `<img src="../${escapeAttr(g.image)}" alt="" />`) : "Пусто — место на сайте зарезервировано"}</div>
      </div>
    `).join("");

    root.querySelectorAll("[data-gallery]").forEach((card) => {
      const i = Number(card.dataset.gallery);
      card.querySelector('[data-field="title"]').addEventListener("input", (e) => {
        data.gallery[i].title = e.target.value;
      });
      card.querySelector("[data-upload]").addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          data.gallery[i].image = await upload(file, "gallery");
          renderGallery();
          status("Медиа загружено", true);
        } catch (err) {
          status("Ошибка загрузки: " + (err.message || "запустите py serve.py"), false);
        }
      });
    });
  }

  function renderMenu() {
    const root = $("menu-editor");
    root.innerHTML = (data.menu || []).map((cat, ci) => `
      <div class="item-card" data-cat="${ci}">
        <div style="display:flex;gap:.5rem;align-items:center;justify-content:space-between">
          <label style="flex:1">Категория<input data-cat-title value="${escapeAttr(cat.title)}" /></label>
          <button type="button" class="btn-secondary" data-del-cat>Удалить</button>
        </div>
        <div class="stack" data-items>
          ${(cat.items || []).map((item, ii) => `
            <div class="row-3" data-item="${ii}">
              <input data-name placeholder="Название" value="${escapeAttr(item.name)}" />
              <input data-meta placeholder="Вес / объём" value="${escapeAttr(item.meta || "")}" />
              <input data-price placeholder="Цена" value="${escapeAttr(item.price)}" />
              <button type="button" class="btn-secondary" data-del-item>✕</button>
            </div>
          `).join("")}
        </div>
        <button type="button" class="btn-secondary" data-add-item>+ Позиция</button>
      </div>
    `).join("");

    root.querySelectorAll("[data-cat]").forEach((card) => {
      const ci = Number(card.dataset.cat);
      card.querySelector("[data-cat-title]").addEventListener("input", (e) => {
        data.menu[ci].title = e.target.value;
      });
      card.querySelector("[data-del-cat]").addEventListener("click", () => {
        if (confirm("Удалить категорию?")) {
          data.menu.splice(ci, 1);
          renderMenu();
        }
      });
      card.querySelector("[data-add-item]").addEventListener("click", () => {
        data.menu[ci].items.push({ name: "Новая позиция", meta: "", price: "0" });
        renderMenu();
      });
      card.querySelectorAll("[data-item]").forEach((row) => {
        const ii = Number(row.dataset.item);
        row.querySelector("[data-name]").addEventListener("input", (e) => { data.menu[ci].items[ii].name = e.target.value; });
        row.querySelector("[data-meta]").addEventListener("input", (e) => { data.menu[ci].items[ii].meta = e.target.value; });
        row.querySelector("[data-price]").addEventListener("input", (e) => { data.menu[ci].items[ii].price = e.target.value; });
        row.querySelector("[data-del-item]").addEventListener("click", () => {
          data.menu[ci].items.splice(ii, 1);
          renderMenu();
        });
      });
    });
  }

  $("add-category").addEventListener("click", () => {
    data.menu.push({ id: "cat-" + Date.now(), title: "Новая категория", items: [] });
    renderMenu();
  });

  $("promo-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      data.promo.image = await upload(file, "promo");
      renderPromoPreview();
      status("Фото акции загружено", true);
    } catch (err) {
      status("Ошибка загрузки: " + (err.message || "запустите py serve.py"), false);
    }
  });

  $("promo-clear").addEventListener("click", () => {
    data.promo.image = "";
    renderPromoPreview();
  });

  function collect() {
    data.club.address = $("club-address").value.trim();
    data.club.hours = $("club-hours").value.trim();
    data.club.phone = $("club-phone").value.trim();
    data.club.phoneRaw = $("club-phone-raw").value.trim();
    data.club.whatsapp = $("club-wa").value.trim();
    data.club.max = $("club-max").value.trim();
    data.club.tagline = $("club-tagline").value.trim();
    data.billiard.price = Number($("billiard-price").value || 0);
    data.billiard.note = $("billiard-note").value.trim();
    data.promo.enabled = $("promo-enabled").checked;
    data.promo.text = $("promo-text").value.trim();
    data.notice = $("notice").value.trim();
  }

  $("save").addEventListener("click", async () => {
    collect();
    if (isStaticHost()) {
      status("На GitHub Pages сохранить нельзя. Открой http://127.0.0.1:5560/admin/", false);
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      let json = null;
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) throw new Error(json?.error || `ошибка ${res.status}`);
      status("Сохранено ✓", true);
    } catch (err) {
      status("Не удалось сохранить: " + (err.message || "запустите py serve.py"), false);
    }
  });

  function status(msg, ok) {
    const el = $("save-status");
    el.textContent = msg;
    el.style.color = ok ? "#2f9a52" : "#ff6b6b";
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replaceAll('"', "&quot;");
  }

  if (authed()) showApp();
})();
