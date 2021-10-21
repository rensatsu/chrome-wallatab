/**
 * An alias for `chrome.i18n.getMessage`
 *
 * @param {string} key Translation strinng key
 * @param {string|string[]|undefined} substitutions Substitutions
 * @returns {string} Translated text
 */
function translate(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions);
}

/**
 * Returns a 2-letter UI language code.
 *
 * @returns {string} Language code (2 letters).
 */
function getUILanguage() {
  return chrome.i18n.getUILanguage().replace(/(\-.*)/, "");
}

export { translate, getUILanguage };
