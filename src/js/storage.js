((_) => {
  const LS = {
    prefix: "wntp_",
    listeners: [],
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

    listen: function (area, cb, key = null) {
      this.listeners.push({
        area: area,
        callback: cb,
        key: key,
      });

      if (!this.registeredListener) {
        this.registeredListener = true;

        chrome.storage.onChanged.addListener((changes, areaName) => {
          Object.keys(changes).forEach((cKey) => {
            this.listeners.forEach((listener) => {
              if (areaName !== listener.area) return;

              if (
                listener.key === null ||
                this.prefix + listener.key === cKey
              ) {
                listener.callback({
                  key: cKey,
                  oldValue: changes[cKey].oldValue,
                  newValue: changes[cKey].newValue,
                });
              }
            });
          });
        });
      }
    },
  };

  window.LS = LS;
})();
