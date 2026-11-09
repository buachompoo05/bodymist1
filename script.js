/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : โหลดสินค้า + ปุ่มกรอง mood
   - order.html   : เติมฟอร์มจาก URL + ส่งออเดอร์ไป Apps Script
   - admin.html   : ดึง CSV จาก Google Sheets มาแสดงเป็นตาราง
   แต่ละส่วนจะทำงานเฉพาะเมื่อเจอ element ของหน้านั้นๆ
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- ตั้งค่า ---------- */
  var APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxoARx8ypYCNq2boqGId9_iTCpH5tQ9s5Hy6taZ6lWiJzVw1-parBbeVYL2nbp0PBmfBw/exec";

  var SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQx24mm7TeGhEyNNHY7KThp7K9WiyAhKxvAzQkEW2a3hlZY4Cv4upE8tkxhjJZ1UoTWIFbnRqyxeKou/pub?gid=0&single=true&output=csv";

  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  /* ---------- ตัวช่วย ---------- */
  function $(id) {
    return document.getElementById(id);
  }

  function formatNumber(value) {
    var n = Number(String(value).replace(/,/g, ""));
    return isNaN(n) || String(value).trim() === ""
      ? String(value)
      : n.toLocaleString("th-TH");
  }

  function moodLabel(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return MOODS[i].label;
    }
    return key;
  }

  /* ==========================================================================
     1) product.html
     ========================================================================== */
  function initProductPage() {
    var filterBar = $("filter-bar");
    var list = $("product-list");
    if (!filterBar || !list) return;

    var products = [];
    var currentMood = "all";

    // อ่าน ?mood=xxx (ถ้าไม่ตรงกับ mood ที่มี ให้ใช้ "ทั้งหมด")
    var paramMood = new URLSearchParams(window.location.search).get("mood");
    if (paramMood) {
      paramMood = paramMood.toLowerCase();
      for (var i = 0; i < MOODS.length; i++) {
        if (MOODS[i].key === paramMood) currentMood = paramMood;
      }
    }

    function renderFilterBar() {
      filterBar.innerHTML = "";
      filterBar.classList.add("filter");

      MOODS.forEach(function (m) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter__btn";
        btn.textContent = m.label;
        btn.dataset.mood = m.key;
        var active = m.key === currentMood;
        btn.setAttribute("aria-pressed", active ? "true" : "false");
        if (active) btn.classList.add("is-active");

        btn.addEventListener("click", function () {
          currentMood = m.key;
          updateUrl();
          renderFilterBar();
          renderProducts();
        });

        filterBar.appendChild(btn);
      });
    }

    function updateUrl() {
      var url = new URL(window.location.href);
      if (currentMood === "all") {
        url.searchParams.delete("mood");
      } else {
        url.searchParams.set("mood", currentMood);
      }
      window.history.replaceState({}, "", url);
    }

    function buildCard(p) {
      var card = document.createElement("article");
      card.className = "product-card";
      card.dataset.mood = p.mood;

      // รูป
      var media = document.createElement("div");
      media.className = "product-card__media";
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      media.appendChild(img);

      // เนื้อหา
      var body = document.createElement("div");
      body.className = "product-card__body";

      var moodRow = document.createElement("div");
      moodRow.className = "product-card__mood";
      var dot = document.createElement("span");
      dot.className = "mood-dot";
      moodRow.appendChild(dot);
      moodRow.appendChild(document.createTextNode(moodLabel(p.mood)));

      var name = document.createElement("h3");
      name.className = "product-card__name";
      name.textContent = p.name;

      var meta = document.createElement("p");
      meta.className = "product-card__meta";
      meta.textContent = p.size;

      body.appendChild(moodRow);
      body.appendChild(name);
      body.appendChild(meta);

      // ราคา + ปุ่มสั่งซื้อ
      var footer = document.createElement("div");
      footer.className = "product-card__footer";

      var price = document.createElement("span");
      price.className = "price";
      price.appendChild(document.createTextNode(formatNumber(p.price)));
      var unit = document.createElement("small");
      unit.textContent = "บาท";
      price.appendChild(unit);

      var order = document.createElement("a");
      order.className = "btn btn--sm";
      order.textContent = "สั่งซื้อ";
      var itemName = p.name + " " + p.size;
      order.href =
        "order.html?item=" +
        encodeURIComponent(itemName) +
        "&price=" +
        encodeURIComponent(p.price);

      footer.appendChild(price);
      footer.appendChild(order);

      card.appendChild(media);
      card.appendChild(body);
      card.appendChild(footer);
      return card;
    }

    function renderProducts() {
      list.innerHTML = "";
      list.classList.add("product-grid");

      var shown = products.filter(function (p) {
        return currentMood === "all" || p.mood === currentMood;
      });

      if (shown.length === 0) {
        var empty = document.createElement("p");
        empty.className = "text-center";
        empty.textContent = "ไม่พบสินค้าในหมวดนี้";
        list.appendChild(empty);
        return;
      }

      shown.forEach(function (p) {
        list.appendChild(buildCard(p));
      });
    }

    renderFilterBar();

    fetch("products.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        renderProducts();
      })
      .catch(function (error) {
        console.error(error);
        list.innerHTML = "";
        var msg = document.createElement("p");
        msg.className = "text-center";
        msg.textContent = "ไม่สามารถโหลดรายการสินค้าได้ กรุณารีเฟรชหน้านี้อีกครั้ง";
        list.appendChild(msg);
      });
  }

  /* ==========================================================================
     2) order.html
     ========================================================================== */
  function initOrderPage() {
    var form = $("orderForm");
    if (!form) return;

    var itemsEl = $("items");
    var totalEl = $("total");

    // เติมชื่อสินค้าและราคาจาก URL ทันที (ต้องเติมทั้งสองช่อง)
    var params = new URLSearchParams(window.location.search);
    var item = params.get("item");
    var price = params.get("price");

    if (item !== null && itemsEl) itemsEl.value = item;
    if (price !== null && totalEl) totalEl.value = price;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var payload = {
        customerName: $("customerName").value.trim(),
        contact: $("contact").value.trim(),
        items: $("items").value.trim(),
        total: $("total").value.trim(),
        note: $("note").value.trim()
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      })
        .then(() => {
          window.location.href = "thankyou.html";
        })
        .catch((error) => {
          console.error(error);
          alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ==========================================================================
     3) admin.html
     ========================================================================== */

  // Parse CSV เอง: รองรับ "..." ครอบค่า, "" แทน ", คอมมาและขึ้นบรรทัดใหม่ในช่อง, CRLF
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }

    // แถวสุดท้ายที่ไม่มีขึ้นบรรทัดใหม่ปิดท้าย
    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  function initAdminPage() {
    var tbody = document.querySelector("#ordersTable tbody");
    if (!tbody) return;

    var COLUMNS = 6; // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, ยอดรวม, หมายเหตุ

    function showMessage(text) {
      tbody.innerHTML = "";
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = COLUMNS;
      td.className = "text-center";
      td.textContent = text;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage("กำลังโหลดข้อมูล...");

    // เติม timestamp กันเบราว์เซอร์ใช้ข้อมูลเก่าจาก cache
    var url = SHEET_CSV_URL + "&t=" + Date.now();

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);

        // ข้ามแถวหัวตาราง และแถวว่าง
        var data = rows.slice(1).filter(function (r) {
          return r.some(function (cell) {
            return cell.trim() !== "";
          });
        });

        // ชีตเพิ่มแถวใหม่ต่อท้ายเสมอ → กลับลำดับให้ล่าสุดขึ้นก่อน
        data.reverse();

        if (data.length === 0) {
          showMessage("ยังไม่มีรายการสั่งซื้อ");
          return;
        }

        tbody.innerHTML = "";
        data.forEach(function (r) {
          var tr = document.createElement("tr");
          for (var c = 0; c < COLUMNS; c++) {
            var td = document.createElement("td");
            var value = r[c] !== undefined ? r[c] : "";
            td.textContent = c === 4 ? formatNumber(value) : value;
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage("ไม่สามารถโหลดข้อมูลได้ กรุณารีเฟรชหน้านี้อีกครั้ง");
      });
  }

  /* ---------- เริ่มทำงาน ---------- */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
