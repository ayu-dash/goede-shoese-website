// ===========================
// DASHBOARD INTERACTIONS
// ===========================

document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // ADD-ON TAG TOGGLE
  // =========================
  document.querySelectorAll(".addon-tag").forEach((tag) => {
    tag.addEventListener("click", (e) => {
      e.preventDefault();
      const checkbox = tag.querySelector("input[type='checkbox']");
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
      }
      tag.classList.toggle("active");
    });
  });

  // =========================
  // LOGISTICS TOGGLE BUTTONS
  // =========================
  document.querySelectorAll(".logistics-toggle .toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.closest(".logistics-toggle");
      group.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // =========================
  // PAYMENT CARD SELECTION
  // =========================
  document.querySelectorAll(".payment-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".payment-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
    });
  });

  // =========================
  // ORDER FILTER TABS
  // =========================
  document.querySelectorAll(".order-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".order-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });

  // =========================
  // ADD SHOE ITEM (Create Order)
  // =========================
  const addShoeBtn = document.getElementById("btn-add-shoe");
  if (addShoeBtn) {
    let shoeCount = document.querySelectorAll(".shoe-item").length;

    addShoeBtn.addEventListener("click", () => {
      shoeCount++;
      const shoeItem = document.createElement("div");
      shoeItem.className = "shoe-item";
      shoeItem.id = `shoe-item-${shoeCount}`;
      shoeItem.innerHTML = `
        <div class="shoe-item-header">
          <span class="shoe-item-label">Item ${shoeCount}</span>
          <button type="button" class="shoe-item-remove" data-item="${shoeCount}">Hapus</button>
        </div>
        <div class="shoe-item-fields">
          <div class="form-group">
            <label class="form-label form-label--upper">Nama Sepatu</label>
            <input type="text" class="form-input" placeholder="Masukkan nama sepatu" />
          </div>
          <div class="form-group">
            <label class="form-label form-label--upper">Jenis Layanan</label>
            <select class="form-input form-select">
              <option>Deep Clean (Regular)</option>
              <option>Fast Clean</option>
              <option>Deep Clean Express</option>
              <option>Premium Repaint</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label form-label--upper">Layanan Tambahan (Add-Ons)</label>
          <div class="addon-tags">
            <label class="addon-tag"><input type="checkbox" /> Unyellowing</label>
            <label class="addon-tag"><input type="checkbox" /> Glue & Repress</label>
            <label class="addon-tag"><input type="checkbox" /> Leather Polish</label>
            <label class="addon-tag"><input type="checkbox" /> Deodorizer</label>
          </div>
        </div>
      `;

      // Insert before the last shoe item's parent's end
      const container = document.querySelector(".order-section");
      container.appendChild(shoeItem);

      // Re-bind addon tag events
      shoeItem.querySelectorAll(".addon-tag").forEach((tag) => {
        tag.addEventListener("click", (e) => {
          e.preventDefault();
          const checkbox = tag.querySelector("input[type='checkbox']");
          if (checkbox) checkbox.checked = !checkbox.checked;
          tag.classList.toggle("active");
        });
      });

      // Bind remove button
      shoeItem.querySelector(".shoe-item-remove").addEventListener("click", () => {
        shoeItem.remove();
      });
    });
  }

  // =========================
  // REMOVE SHOE ITEM
  // =========================
  document.querySelectorAll(".shoe-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".shoe-item");
      if (item) item.remove();
    });
  });
});
