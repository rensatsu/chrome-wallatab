/**
 * Setings storage class.
 * @class Storage.
 */
class Storage {
  /**
   * Settings key prefix.
   * @type {string}
   * @memberof Storage
   */
  #prefix;

  /**
   * Creates an instance of Storage.
   * @param {string} [prefix=""] Prefix for settings keys.
   * @memberof Storage
   */
  constructor(prefix = "") {
    this.#prefix = prefix;
  }

  /**
   * Check if selected storage area is available.
   *
   * @param {string} area Storage area (local, sync, managed).
   * @returns {boolean}
   * @link https://developer.chrome.com/docs/extensions/reference/storage/#properties
   * @memberof Storage
   */
  check(area) {
    return typeof chrome.storage[area] !== "undefined";
  }

  /**
   * Create or overwrite setting key.
   *
   * @param {string} area Storage area (local, sync, managed).
   * @param {string} key Setting key.
   * @param {any} value Setting value.
   * @returns {Promise<void>}
   * @memberof Storage
   */
  async set(area, key, value) {
      if (!this.check(area)) throw new Error("Unable to check for storage");
      return chrome.storage[area].set({ [this.#prefix + key]: value });
  }

  /**
   * Get value of a setting key.
   *
   * @param {string} area Storage area (local, sync, managed).
   * @param {string} key Setting key.
   * @returns {Promise<any|null>}
   * @memberof Storage
   */
  async get(area, key) {
    if (!this.check(area)) throw new Error("Unable to check for storage");
    const result = await chrome.storage[area].get(this.#prefix + key);
    return result?.[this.#prefix + key] ?? null;
  }

  /**
   * Delete a setting key.
   *
   * @param {string} area Storage area (local, sync, managed).
   * @param {string} key Setting key.
   * @returns {Promise<void>}
   * @memberof Storage
   */
  async del(area, key) {
    if (!this.check(area)) throw new Error("Unable to check for storage");
    return chrome.storage[area].remove(this.#prefix + key);
  }
}

export { Storage };
