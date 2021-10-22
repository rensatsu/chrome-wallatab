class Storage {
  #prefix;

  constructor(prefix = "") {
    this.#prefix = prefix;
  }

  check(area) {
    return typeof chrome.storage[area] !== "undefined";
  }

  set(area, key, value) {
    return new Promise((resolve, reject) => {
      if (!this.check(area)) {
        reject(new Error("Unable to check for storage"));
        return;
      }

      chrome.storage[area].set({ [this.#prefix + key]: value }, () => resolve());
    });
  }

  get(area, key) {
    return new Promise((resolve, reject) => {
      if (!this.check(area)) {
        reject(new Error("Unable to check for storage"));
        return;
      }

      chrome.storage[area].get(this.#prefix + key, (result) => {
        resolve(result[this.#prefix + key] ?? null);
      });
    });
  }

  del(area, key) {
    return new Promise((resolve, reject) => {
      if (!this.check(area)) {
        reject(new Error("Unable to check for storage"));
        return;
      }

      chrome.storage[area].remove(this.#prefix + key, () => {
        resolve();
      });
    });
  }
}

export { Storage };
