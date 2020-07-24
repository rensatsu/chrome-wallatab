(() => {
  const LS = {
    prefix: "wntp_",
    registeredListener: false,

    check: function (area) {
      return typeof chrome.storage[area] !== "undefined";
    },

    set: function (area, key, value) {
      return new Promise((resolve, reject) => {
        if (!this.check(area)) {
          reject(new Error("Unable to check for storage"));
          return;
        }

        chrome.storage[area].set({ [this.prefix + key]: value }, () =>
          resolve()
        );
      });
    },

    get: function (area, key) {
      return new Promise((resolve, reject) => {
        if (!this.check(area)) {
          reject(new Error("Unable to check for storage"));
          return;
        }

        chrome.storage[area].get(this.prefix + key, (result) => {
          resolve(result[this.prefix + key] || null);
        });
      });
    },

    del: function (area, key) {
      return new Promise((resolve, reject) => {
        if (!this.check(area)) {
          reject(new Error("Unable to check for storage"));
          return;
        }

        chrome.storage[area].remove(this.prefix + key, () => {
          resolve();
        });
      });
    },
  };

  window.LS = LS;
})();
