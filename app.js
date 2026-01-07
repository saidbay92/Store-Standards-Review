/**
 * Store Standards Review (web) - based on the provided PDF template.
 * Scores: each item 0/1/2 points. Section max 10. Total max 100.
 *
 * ✅ You must set your Apps Script endpoint URL below.
 */
const ENDPOINT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

// You can adjust these thresholds anytime.
const RATING_THRESHOLDS = {
  greenMin: 90,
  amberMin: 80
};

// Template sections and questions (5 each).
const TEMPLATE = [
  {
    code: "A",
    name: "Store Appearance",
    items: [
      "Visual appeal - store, staffing, service, and product - looks inviting",
      "External area around store is clean and uncluttered; no competing activity; clear access to the store",
      "Front of store and display lighting operational",
      "Store displays are full, and have colour and impact. Product is ‘abundant’",
      "Approved counter top items in place, full, clean"
    ]
  },
  {
    code: "B",
    name: "Customer Service",
    items: [
      "Team members smile and greet all customers, acknowledge waiting customers",
      "Team member takes ownership of the customer order and expedites delivery",
      "Team member engages Loyalty Card customers and regulars; thanks every customer with a smile",
      "Transactions handled efficiently and product quality checked on the pass",
      "Store music playing at an appropriate volume"
    ]
  },
  {
    code: "C",
    name: "Counter Display",
    items: [
      "Glass display is clean, inside counter is clean, counter top is clear – clear line of sight",
      "Product stocked, correctly prepared, displayed and refreshed – fruit salads, salads, yoghurts, choc fruit",
      "Juice Bar product is full, well presented and fresh",
      "All product ticketing is in place, current, and clean",
      "Staff are leaving store during breaks - no eating or use of mobiles in store. No personal items in store"
    ]
  },
  {
    code: "D",
    name: "People",
    items: [
      "Team member selection reflects the brand and ethos – healthy, fun, happy",
      "Appearance and grooming to a high standard, hair tied up, personal hygiene",
      "Everyone compliant with dress standard including hat, name badge, and apron",
      "All wearing long black bottoms and appropriate closed-in footwear",
      "Clothes clean and ironed"
    ]
  },
  {
    code: "E",
    name: "Brand Image",
    items: [
      "First impressions of cleanliness, quality and freshness",
      "All store signage in place, external signage visible and operational",
      "Menu boards correct, no handwritten or non-brand signs. All product correctly signed/ticketed",
      "Store tie-up reflects current offers, all signage and promotional components in place",
      "Visual merchandising standards – flower vase, fruit displays to a high standard; not excessive"
    ]
  },
  {
    code: "F",
    name: "Food Safety & Hygiene",
    items: [
      "Hand basin clean and clear, tap operational, soap and paper towels full",
      "Food safety and hygiene standards observed; team washing hands at start of shift and before handling food",
      "Team members wearing gloves when handling food",
      "Temperature control log is maintained. Refrigeration equipment operational. Sliding windows kept on.",
      "Food Safety Supervisor certificate is available"
    ]
  },
  {
    code: "G",
    name: "Team Work",
    items: [
      "Diversity - team roster reflects customer/community profile",
      "Appropriate team member numbers rostered/rosters to forecast",
      "Respect & Recognition - positive team behaviours and leadership",
      "Caring for each other - working safely 'everyone everyday'",
      "Working efficiently - work areas kept clean and uncluttered (clean as you go)"
    ]
  },
  {
    code: "H",
    name: "Cleaning Standards",
    items: [
      "Store clean and tidy. Store cleaning routine/checklist actioned daily",
      "Detail cleaning standards evident (all surfaces, sink areas, under-counters, fridges etc clean/sanitised)",
      "All cleaning products and equipment safely stored",
      "Store room/Cool room clean and tidy",
      "No evidence of pests"
    ]
  },
  {
    code: "I",
    name: "Product Handling",
    items: [
      "All product displayed, stored and refrigerated correctly as per shelf life guidelines",
      "All product checked for freshness and quality",
      "Juice Bar stock and display containers constantly refreshed. Removal of sub-standard stock",
      "Product in fridges/cool room covered as necessary to avoid contamination",
      "No food product is placed or stored on the floor. Nothing is stored in the Ice Machine"
    ]
  },
  {
    code: "J",
    name: "Services & Facilities",
    items: [
      "All food service equipment operational; equipment correctly cleaned and maintained",
      "Store is not missing any equipment",
      "POS and payment equipment operational, area uncluttered",
      "Services - electrical, air-con, AV, water/drainage all operational",
      "Building maintenance and cleaning - walls, floor, ceiling/awning, fit out"
    ]
  }
];

// ===== App state =====
const state = {
  // keys like "A1": 0|1|2
  scores: {},
  photos: [] // base64 data URLs (compressed)
};

function $(id) { return document.getElementById(id); }

function init() {
  // Default date = today (local)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  $("reviewDate").value = `${yyyy}-${mm}-${dd}`;

  renderSections();
  renderSectionScores();
  updateTotals();
  seedActionRows(3);

  $("addActionRow").addEventListener("click", () => addActionRow());
  $("photos").addEventListener("change", handlePhotosSelected);
  $("submitBtn").addEventListener("click", handleSubmit);
  $("downloadJsonBtn").addEventListener("click", downloadJsonBackup);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
}

function renderSections() {
  const root = $("sections");
  root.innerHTML = "";

  TEMPLATE.forEach(section => {
    const sec = document.createElement("div");
    sec.className = "section";
    sec.dataset.section = section.code;

    const header = document.createElement("div");
    header.className = "section-title";

    const left = document.createElement("div");
    left.innerHTML = `<h3>${escapeHtml(section.name)}</h3><div class="section-sub">${section.code}1 – ${section.code}5</div>`;

    const right = document.createElement("div");
    right.innerHTML = `<div class="muted"><b id="secScore_${section.code}">0</b>/10</div>`;

    header.appendChild(left);
    header.appendChild(right);

    const items = document.createElement("div");
    items.className = "items";

    section.items.forEach((text, idx) => {
      const n = idx + 1;
      const key = `${section.code}${n}`;
      state.scores[key] = state.scores[key] ?? 0;

      const item = document.createElement("div");
      item.className = "item";

      const top = document.createElement("div");
      top.className = "item-top";

      const t = document.createElement("div");
      t.innerHTML = `<div class="item-text">${escapeHtml(text)}</div><div class="item-code">${key}</div>`;

      const btns = document.createElement("div");
      btns.className = "score-buttons";

      [0,1,2].forEach(val => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "score-btn" + (state.scores[key] === val ? " active" : "");
        b.textContent = String(val);
        b.addEventListener("click", () => {
          state.scores[key] = val;
          // update button states
          [...btns.children].forEach(ch => ch.classList.remove("active"));
          b.classList.add("active");
          updateTotals();
        });
        btns.appendChild(b);
      });

      top.appendChild(t);
      top.appendChild(btns);

      item.appendChild(top);
      items.appendChild(item);
    });

    sec.appendChild(header);
    sec.appendChild(items);
    root.appendChild(sec);
  });
}

function renderSectionScores() {
  const root = $("sectionScores");
  root.innerHTML = "";

  TEMPLATE.forEach(section => {
    const row = document.createElement("div");
    row.className = "section-score";
    row.innerHTML = `<div class="name">${escapeHtml(section.name)}</div><div class="val" id="rowScore_${section.code}">0/10</div>`;
    root.appendChild(row);
  });
}

function updateTotals() {
  let total = 0;

  TEMPLATE.forEach(section => {
    let secTotal = 0;
    for (let i=1; i<=5; i++) {
      secTotal += (state.scores[`${section.code}${i}`] ?? 0);
    }
    total += secTotal;

    const secScoreEl = $(`secScore_${section.code}`);
    if (secScoreEl) secScoreEl.textContent = String(secTotal);

    const rowScoreEl = $(`rowScore_${section.code}`);
    if (rowScoreEl) rowScoreEl.textContent = `${secTotal}/10`;
  });

  $("totalScore").textContent = String(total);

  const rating = total >= RATING_THRESHOLDS.greenMin
    ? "Green"
    : total >= RATING_THRESHOLDS.amberMin
      ? "Amber"
      : "Red";

  $("overallRating").textContent = rating;

  const box = $("ratingBox");
  box.style.borderColor = "rgba(255,255,255,0.08)";
  box.style.background = "rgba(255,255,255,0.03)";

  if (rating === "Green") {
    box.style.borderColor = "rgba(45,212,191,0.4)";
    box.style.background = "rgba(45,212,191,0.08)";
  } else if (rating === "Amber") {
    box.style.borderColor = "rgba(251,191,36,0.35)";
    box.style.background = "rgba(251,191,36,0.08)";
  } else {
    box.style.borderColor = "rgba(251,113,133,0.35)";
    box.style.background = "rgba(251,113,133,0.08)";
  }
}

function seedActionRows(n) {
  for (let i=0; i<n; i++) addActionRow();
}

function addActionRow(initial = {}) {
  const tbody = $("actionRows");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input placeholder="e.g., A3" value="${escapeAttr(initial.itemRef || "")}"></td>
    <td><input placeholder="Action point..." value="${escapeAttr(initial.action || "")}"></td>
    <td><input placeholder="Name" value="${escapeAttr(initial.byWho || "")}"></td>
    <td><input type="date" value="${escapeAttr(initial.byWhen || "")}"></td>
  `;

  tbody.appendChild(tr);
}

function getActionPlan() {
  const rows = [];
  const tbody = $("actionRows");
  [...tbody.querySelectorAll("tr")].forEach(tr => {
    const tds = tr.querySelectorAll("td input");
    const row = {
      itemRef: tds[0].value.trim(),
      action: tds[1].value.trim(),
      byWho: tds[2].value.trim(),
      byWhen: tds[3].value
    };
    // include row if it has anything
    if (row.itemRef || row.action || row.byWho || row.byWhen) rows.push(row);
  });
  return rows;
}

/**
 * Photo handling: compress images so your submission is fast and less likely to fail.
 * - Max 5 photos
 * - Resize longest side to 1280px
 * - JPEG quality 0.72
 */
async function handlePhotosSelected() {
  const input = $("photos");
  const files = [...(input.files || [])].slice(0, 5);

  state.photos = [];
  $("photoPreview").innerHTML = "";

  for (const file of files) {
    const base64 = await fileToDataURL(file);
    const compressed = await compressImage(base64, 1280, 0.72);
    state.photos.push(compressed);
    addPhotoPreview(compressed);
  }
}

function addPhotoPreview(dataUrl) {
  const img = document.createElement("img");
  img.src = dataUrl;
  $("photoPreview").appendChild(img);
}

function fileToDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl, maxSide, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      let newW = width;
      let newH = height;

      if (Math.max(width, height) > maxSide) {
        const scale = maxSide / Math.max(width, height);
        newW = Math.round(width * scale);
        newH = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, newW, newH);

      const out = canvas.toDataURL("image/jpeg", quality);
      resolve(out);
    };
    img.src = dataUrl;
  });
}

function buildPayload() {
  const scores = {};
  TEMPLATE.forEach(section => {
    for (let i=1; i<=5; i++) {
      const key = `${section.code}${i}`;
      scores[key] = state.scores[key] ?? 0;
    }
  });

  return {
    formName: "Store Standards Review",
    submittedBy: $("submittedBy").value.trim(),
    recipientEmails: $("recipientEmails").value.trim(),
    meta: {
      store: $("store").value.trim(),
      storeManager: $("storeManager").value.trim(),
      reviewDate: $("reviewDate").value,
      reviewedBy: $("reviewedBy").value.trim(),
      overallRating: $("overallRating").textContent,
      totalScore: Number($("totalScore").textContent || 0)
    },
    scores,
    sections: TEMPLATE, // include labels for PDF generation
    overallComments: $("overallComments").value.trim(),
    actionPlan: getActionPlan(),
    photos: state.photos // base64 data URLs
  };
}

async function handleSubmit() {
  const status = $("status");

  if (!ENDPOINT_URL || ENDPOINT_URL.includes("PASTE_YOUR")) {
    status.textContent = "❌ Please set ENDPOINT_URL in app.js to your Apps Script Web App URL.";
    return;
  }

  const payload = buildPayload();

  // Light validation: store + reviewed by is usually helpful
  if (!payload.meta.store) {
    status.textContent = "❌ Please enter Store.";
    return;
  }
  if (!payload.meta.reviewedBy) {
    status.textContent = "❌ Please enter Reviewed by.";
    return;
  }

  status.textContent = "Sending…";

  try {
    const res = await fetch(ENDPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (json.ok) {
      status.innerHTML = `✅ Sent. PDF: <a href="${json.pdfUrl}" target="_blank" rel="noopener">Open PDF</a>`;
    } else {
      status.textContent = "❌ Error: " + (json.error || "Unknown error");
    }
  } catch (e) {
    status.textContent = "❌ Network error: " + e;
  }
}

function downloadJsonBackup() {
  const payload = buildPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `store-standards-review-${payload.meta.store || "store"}-${payload.meta.reviewDate || "date"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/\n/g, " ").replace(/\r/g, " ");
}

init();
