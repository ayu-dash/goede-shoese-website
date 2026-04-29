// ===========================
// DASHBOARD INTERACTIONS
// ===========================

document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // PRICE CONFIGURATION
  // =========================
  const SERVICE_PRICES = window.DYNAMIC_PRICES
    ? window.DYNAMIC_PRICES.SERVICES
    : {};
  const ADDON_PRICES = window.DYNAMIC_PRICES
    ? window.DYNAMIC_PRICES.ADDONS
    : {};

  // =========================
  // CUSTOM YEAR DROPDOWN LOGIC
  // =========================
  const yearWrapper = document.getElementById("customYearSelect");
  if (yearWrapper) {
    const yearTrigger = yearWrapper.querySelector(".custom-select-trigger");
    const yearOptions = yearWrapper.querySelectorAll(".custom-option");

    // Buka tutup dropdown
    yearTrigger.addEventListener("click", function (e) {
      e.stopPropagation();
      yearWrapper.classList.toggle("open");
    });

    // Saat tahun dipilih
    yearOptions.forEach((option) => {
      option.addEventListener("click", function (e) {
        e.stopPropagation();

        const selectedYear = this.getAttribute("data-value");

        // Tutup dropdown
        yearWrapper.classList.remove("open");

        // Langsung redirect halaman persis seperti fungsi onchange bawaan
        window.location.href = "?year=" + selectedYear;
      });
    });

    // Tutup jika klik di luar area
    document.addEventListener("click", function (e) {
      if (!yearWrapper.contains(e.target)) {
        yearWrapper.classList.remove("open");
      }
    });
  }

  // =========================
  // UPDATE SUMMARY LOGIC
  // =========================
  const updateOrderSummary = () => {
    const summaryContainer = document.getElementById("summary-items-container");
    const subtotalEl = document.getElementById("summary-subtotal");
    const logisticsEl = document.getElementById("summary-logistics");
    const totalEl = document.getElementById("summary-total");

    if (!summaryContainer) return;

    let subtotal = 0;
    const items = [];
    let maxDaysMin = 0;
    let maxDaysMax = 0;
    const SERVICE_METADATA = window.DYNAMIC_SERVICES || {};

    const getDays = (name) => {
      const meta = SERVICE_METADATA[name];
      if (!meta) return { min: 0, max: 0 };
      const multiplier = meta.timeUnit === "Minggu" ? 7 : 1;
      return { min: meta.timeMin * multiplier, max: meta.timeMax * multiplier };
    };

    document.querySelectorAll(".order-section .shoe-item").forEach((item) => {
      const rawShoeName = item.querySelector(".shoe-name").value.trim();
      const serviceType = item.querySelector(".service-type").value;
      const shoeLabel = item.querySelector(".shoe-item-label")
        ? item.querySelector(".shoe-item-label").innerText
        : "Item";

      const addons = [];
      item.querySelectorAll(".addon-tag input:checked").forEach((cb) => {
        addons.push(cb.value);
      });

      if (!rawShoeName && !serviceType && addons.length === 0) {
        return;
      }

      const shoeName = rawShoeName || shoeLabel;
      let itemPrice = SERVICE_PRICES[serviceType] || 0;

      let itemMin = getDays(serviceType).min;
      let itemMax = getDays(serviceType).max;

      addons.forEach((a) => {
        itemPrice += ADDON_PRICES[a] || 0;

        const aDays = getDays(a);
        if (aDays.max > 0) {
          itemMax = Math.max(itemMax, aDays.max);
          itemMin = Math.max(itemMin, aDays.min);
        }
      });

      maxDaysMin = Math.max(maxDaysMin, itemMin);
      maxDaysMax = Math.max(maxDaysMax, itemMax);

      subtotal += itemPrice;

      const basePrice = SERVICE_PRICES[serviceType] || 0;
      const addonsDetail = addons.map((a) => ({
        name: a,
        price: ADDON_PRICES[a] || 0,
      }));

      items.push({
        shoeName,
        serviceType: serviceType || "Belum dipilih",
        basePrice,
        addonsDetail,
        itemPrice,
      });
    });

    if (items.length === 0) {
      summaryContainer.innerHTML = `<div class="order-summary-item placeholder-item"><p class="text-muted">Tambahkan sepatu untuk melihat ringkasan</p></div>`;
    } else {
      summaryContainer.innerHTML = items
        .map(
          (item) => `
        <div class="order-summary-item-wrapper">
          <div class="order-summary-item">
            <div>
              <span class="summary-item-name">${item.shoeName.length > 20 ? item.shoeName.substring(0, 17) + "..." : item.shoeName}</span>
              <span class="summary-item-service">${item.serviceType.toUpperCase()}</span>
            </div>
            <span class="summary-item-price">Rp ${item.basePrice.toLocaleString("id-ID")}</span>
          </div>
          ${item.addonsDetail
            .map(
              (a) => `
            <div class="order-summary-addon">
              <span class="summary-addon-name">+ ${a.name}</span>
              <span class="summary-addon-price">Rp ${a.price.toLocaleString("id-ID")}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      `,
        )
        .join("");
    }

    const PICKUP_FEE = window.DYNAMIC_PRICES
      ? window.DYNAMIC_PRICES.PICKUP_FEE
      : 15000;
    const DELIVERY_FEE = window.DYNAMIC_PRICES
      ? window.DYNAMIC_PRICES.DELIVERY_FEE
      : 15000;

    const pickupMethod = document.querySelector("[data-group='pickup'].active")
      ?.dataset.value;
    const deliveryMethod = document.querySelector(
      "[data-group='delivery'].active",
    )?.dataset.value;

    let logisticsFee = 0;
    if (pickupMethod === "pickup") logisticsFee += PICKUP_FEE;
    if (deliveryMethod === "delivery") logisticsFee += DELIVERY_FEE;

    subtotalEl.innerText = `Rp ${subtotal.toLocaleString("id-ID")}`;
    logisticsEl.innerText = `Rp ${logisticsFee.toLocaleString("id-ID")}`;
    totalEl.innerText = `Rp ${(subtotal + logisticsFee).toLocaleString("id-ID")}`;

    const estimateBadge = document.querySelector(".estimate-badge");
    if (estimateBadge) {
      if (maxDaysMax === 0) {
        estimateBadge.innerText = "0 Hari";
      } else {
        estimateBadge.innerText =
          maxDaysMin === maxDaysMax
            ? `${maxDaysMax} Hari`
            : `${maxDaysMin}-${maxDaysMax} Hari`;
      }
    }
  };

  document.addEventListener("change", (e) => {
    if (
      e.target.classList.contains("shoe-name") ||
      e.target.classList.contains("service-type") ||
      e.target.type === "checkbox"
    ) {
      updateOrderSummary();
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.classList.contains("shoe-name")) {
      updateOrderSummary();
    }
  });

  const originalToggleLogic = (btn) => {
    const group = btn.closest(".logistics-toggle");
    group
      .querySelectorAll(".toggle-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    updateOrderSummary();
  };
  // =========================
  // ADD-ON TAG TOGGLE (Delegated)
  // =========================
  document.addEventListener("click", (e) => {
    const tag = e.target.closest(".addon-tag");
    if (!tag) return;

    const checkbox = tag.querySelector("input[type='checkbox']");
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      // Trigger native-like change event to fire updateOrderSummary
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      tag.classList.toggle("active", checkbox.checked);
    }
  });

  // =========================
  // LOGISTICS TOGGLE BUTTONS
  // =========================
  document.querySelectorAll(".logistics-toggle .toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.closest(".logistics-toggle");
      group
        .querySelectorAll(".toggle-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const groupName = btn.dataset.group; // pickup or delivery
      const value = btn.dataset.value; // self or pickup/delivery

      if (groupName === "pickup") {
        const detail = document.getElementById("pickup-detail");
        const info = document.getElementById("pickup-self-info");
        if (value === "pickup") {
          detail.classList.remove("d-none");
          info.classList.add("d-none");
        } else {
          detail.classList.add("d-none");
          info.classList.remove("d-none");
        }
      } else {
        const detail = document.getElementById("delivery-detail");
        const info = document.getElementById("delivery-self-info");
        if (value === "delivery") {
          detail.classList.remove("d-none");
          info.classList.add("d-none");
        } else {
          detail.classList.add("d-none");
          info.classList.remove("d-none");
        }
      }

      updateOrderSummary();
    });
  });

  // =========================
  // PAYMENT CARD SELECTION
  // =========================
  document.querySelectorAll(".payment-card").forEach((card) => {
    card.addEventListener("click", () => {
      document
        .querySelectorAll(".payment-card")
        .forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
    });
  });

  // =========================
  // SAVED ADDRESS SELECTORS
  // =========================
  const pickupSelector = document.getElementById("pickup-address-selector");
  const deliverySelector = document.getElementById("delivery-address-selector");
  const syncCheckbox = document.getElementById("sync-address-checkbox");

  if (pickupSelector) {
    pickupSelector.addEventListener("change", (e) => {
      const manualContainer = document.getElementById(
        "pickup-address-manual-container",
      );
      if (e.target.value === "manual") {
        manualContainer.classList.remove("d-none");
      } else {
        manualContainer.classList.add("d-none");
      }

      // If sync is enabled, mirror to delivery
      if (syncCheckbox && syncCheckbox.checked) {
        deliverySelector.value = e.target.value;
        deliverySelector.dispatchEvent(new Event("change"));
      }
    });
  }

  if (deliverySelector) {
    deliverySelector.addEventListener("change", (e) => {
      const manualContainer = document.getElementById(
        "delivery-address-manual-container",
      );
      if (e.target.value === "manual") {
        manualContainer.classList.remove("d-none");
      } else {
        manualContainer.classList.add("d-none");
      }

      // If manually changing delivery, uncheck sync if it was checked but value differs
      if (
        syncCheckbox &&
        syncCheckbox.checked &&
        e.target.value !== pickupSelector.value
      ) {
        syncCheckbox.checked = false;
      }
    });
  }

  if (syncCheckbox) {
    syncCheckbox.addEventListener("change", (e) => {
      if (e.target.checked && pickupSelector) {
        deliverySelector.value = pickupSelector.value;
      }
    });
  }

  // =========================
  // ORDER FILTER TABS
  // =========================
  const orderTabs = document.querySelectorAll(".order-tab");
  const activeOrdersSection = document.getElementById("active-orders-section");
  const historyOrdersSection = document.getElementById(
    "history-orders-section",
  );

  if (orderTabs.length > 0) {
    orderTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        orderTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const filter = tab.dataset.filter;

        document
          .querySelectorAll(".active-order-card, .history-card")
          .forEach((card) => {
            if (filter === "all" || card.dataset.orderStatus === filter) {
              card.style.display = "";
            } else {
              card.style.display = "none";
            }
          });

        if (activeOrdersSection) {
          activeOrdersSection.style.display =
            filter === "all" || filter === "proses" ? "" : "none";
        }

        if (historyOrdersSection) {
          historyOrdersSection.style.display =
            filter === "all" || filter === "selesai" || filter === "batal"
              ? ""
              : "none";
        }
      });
    });
  }

  // =========================
  // ADD SHOE ITEM (Create Order)
  // =========================
  const addShoeBtn = document.getElementById("btn-add-shoe");
  if (addShoeBtn) {
    let shoeCount = document.querySelectorAll(".shoe-item").length;

    addShoeBtn.addEventListener("click", () => {
      shoeCount++;

      const templateEl = document.getElementById("shoe-item-template");
      const container = document.querySelector(".order-section");

      if (templateEl) {
        // Gunakan template dinamis dari HTML jika tersedia
        const newShoeHtml = templateEl.innerHTML.replace(/{INDEX}/g, shoeCount);
        const wrapper = document.createElement("div");
        wrapper.innerHTML = newShoeHtml.trim();
        const shoeItem = wrapper.firstElementChild;
        shoeItem.id = `shoe-item-${shoeCount}`;
        container.appendChild(shoeItem);
      } else {
        // Fallback statis jika template tak ditemukan
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
              <input type="text" class="form-input shoe-name" placeholder="Masukkan nama sepatu" />
            </div>
            <div class="form-group">
              <label class="form-label form-label--upper">Jenis Layanan</label>
              <select class="form-input form-select service-type">
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
              <label class="addon-tag"><input type="checkbox" value="Unyellowing" /> Unyellowing (Rp 50.000)</label>
              <label class="addon-tag"><input type="checkbox" value="Glue & Repress" /> Glue & Repress (Rp 60.000)</label>
              <label class="addon-tag"><input type="checkbox" value="Leather Polish" /> Leather Polish (Rp 30.000)</label>
              <label class="addon-tag"><input type="checkbox" value="Deodorizer" /> Deodorizer (Rp 15.000)</label>
            </div>
          </div>
        `;
        container.appendChild(shoeItem);
      }

      updateOrderSummary();
    });
  }

  // =========================
  // REMOVE SHOE ITEM (Delegated)
  // =========================
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".shoe-item-remove");
    if (!btn) return;

    const item = btn.closest(".shoe-item");
    if (item) {
      item.remove();
      updateOrderSummary();
    }
  });

  // =========================
  // CONFIRM ORDER
  // =========================
  const confirmOrderBtn = document.getElementById("btn-confirm-order");
  if (confirmOrderBtn) {
    confirmOrderBtn.addEventListener("click", async () => {
      const shoeItems = [];
      let hasError = false;

      document.querySelectorAll(".order-section .shoe-item").forEach((item) => {
        const shoeName = item.querySelector(".shoe-name").value;
        const serviceType = item.querySelector(".service-type").value;
        const addons = [];
        item.querySelectorAll(".addon-tag input:checked").forEach((cb) => {
          addons.push(cb.value);
        });

        if (!shoeName || !serviceType) {
          hasError = true;
        }

        if (shoeName && serviceType) {
          shoeItems.push({ shoeName, serviceType, addons });
        }
      });

      if (hasError) {
        alert("Mohon lengkapi nama sepatu dan pilih jenis layanannya.");
        return;
      }

      if (shoeItems.length === 0) {
        alert("Mohon tambahkan setidaknya satu sepatu.");
        return;
      }

      const pickupMethod = document.querySelector(
        "[data-group='pickup'].active",
      ).dataset.value;
      const deliveryMethod = document.querySelector(
        "[data-group='delivery'].active",
      ).dataset.value;

      const pickupSelector = document.getElementById("pickup-address-selector");
      const deliverySelector = document.getElementById(
        "delivery-address-selector",
      );
      const pickupManualInput = document.getElementById(
        "pickup-address-manual",
      );
      const deliveryManualInput = document.getElementById(
        "delivery-address-manual",
      );

      let pickupAddress = "";
      let pickupPhone = "";
      if (pickupMethod === "pickup" && pickupSelector) {
        if (pickupSelector.value === "manual") {
          pickupAddress = pickupManualInput.value.trim();
          pickupPhone = ""; // Manual address might not have phone input yet, fallback to user phone in controller if needed
        } else {
          pickupAddress = pickupSelector.value;
          const selectedOption =
            pickupSelector.options[pickupSelector.selectedIndex];
          pickupPhone = selectedOption.getAttribute("data-phone") || "";
        }
      }

      let deliveryAddress = "";
      let deliveryPhone = "";
      if (deliveryMethod === "delivery" && deliverySelector) {
        if (deliverySelector.value === "manual") {
          deliveryAddress = deliveryManualInput.value.trim();
          deliveryPhone = "";
        } else {
          deliveryAddress = deliverySelector.value;
          const selectedOption =
            deliverySelector.options[deliverySelector.selectedIndex];
          deliveryPhone = selectedOption.getAttribute("data-phone") || "";
        }
      }

      if (
        pickupMethod === "pickup" &&
        (!pickupAddress || pickupAddress === "")
      ) {
        alert("Mohon masukkan atau pilih alamat penjemputan.");
        return;
      }

      if (
        deliveryMethod === "delivery" &&
        (!deliveryAddress || deliveryAddress === "")
      ) {
        alert("Mohon masukkan atau pilih alamat pengantaran.");
        return;
      }

      const paymentMethod = document.querySelector(
        "input[name='payment']:checked",
      ).value;

      const orderData = {
        items: shoeItems,
        logistics: {
          pickupMethod,
          pickupPhone,
          deliveryMethod,
          deliveryAddress,
          deliveryPhone,
          pickupAddress,
        },
        payment: {
          method: paymentMethod,
        },
      };

      try {
        confirmOrderBtn.disabled = true;
        confirmOrderBtn.innerText = "Memproses...";

        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        });

        const result = await response.json();

        if (result.status === "success") {
          alert("Pesanan berhasil dibuat!");
          window.location.href = "/customer/my-orders";
        } else {
          alert("Gagal membuat pesanan: " + result.message);
          confirmOrderBtn.disabled = false;
          confirmOrderBtn.innerText = "Konfirmasi Pesanan";
        }
      } catch (err) {
        console.error("Error creating order:", err);
        alert("Terjadi kesalahan sistem. Silakan coba lagi.");
        confirmOrderBtn.disabled = false;
        confirmOrderBtn.innerText = "Konfirmasi Pesanan";
      }
    });
  }
});
