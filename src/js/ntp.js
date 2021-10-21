import { LS } from "./ls.js";
import { ANIMATION_FAST, ANIMATION_SLOW, CREDITS_LINK } from "./constants.js";
import { fallbackImage } from "./fallback-image.js";
import { getUILanguage, translate } from "./translate.js";

let initCompleted = false;

let elemImage, elemCopyright, elemOverlay, elemSettingsBtn;

// Control output of debug information
// To enable:
// `chrome.storage.local.set({ wntp_debug: true });`
let isDebug = false;
LS.get("local", "debug").then((d) => (isDebug = !!d));


/**
 * Create and initialize required elements
 */
function initElements() {
  // document language
  document.documentElement.lang = getUILanguage();

  // image
  elemImage = document.querySelector("#image");
  elemImage.addEventListener("error", () => fetchWallpaper());
  elemImage.hidden = false;

  // overlay
  elemOverlay = document.querySelector("#overlay");

  // copyright info label
  elemCopyright = document.querySelector("#sources");

  // settings button
  elemSettingsBtn = document.querySelector("#btn-settings");
  elemSettingsBtn.title = translate("settingsTitle");
  elemSettingsBtn.hidden = false;
  elemSettingsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // loading an image for settings button
  fetch(chrome.runtime.getURL("img/settings.svg"))
    .then((d) => d.text())
    .then((d) => {
      elemSettingsBtn.innerHTML = d;
    });
}

/**
 * Animation wrapper
 *
 * @param {Array} keyframes Keyframes array
 * @param {Number} duration Animation diration
 * @param {Function} cb Callback when animation finishes
 */
function animateImage(keyframes, duration, cb) {
  const anim = elemImage.animate(keyframes, {
    duration: duration,
    fill: "forwards",
    easing: "ease-in-out",
  });

  anim.addEventListener("finish", () => cb());
}

/**
 * Fade-in animation
 *
 * @returns {Promise}
 */
function fadeInWall() {
  return new Promise((resolve) => {
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];

    animateImage(keyframes, ANIMATION_SLOW, resolve);
  });
}

/**
 * Fade-out animation
 *
 * @returns {Promise}
 */
function fadeOutWall() {
  return new Promise((resolve) => {
    const keyframes = [{ opacity: 1 }, { opacity: 0 }];

    animateImage(keyframes, ANIMATION_FAST, resolve);
  });
}

/**
 * Show image source link
 */
function showSourcesLink() {
  elemCopyright.hidden = false;
}

/**
 * Hide image source link
 */
function hideSourcesLink() {
  elemCopyright.hidden = true;
}

/**
 * Set wallpaper image
 *
 * @param {object} data Image data
 * @param {string} data.image Image link
 * @param {boolean} data.isBlob True when a link is a blob-url
 * @param {string|null} data.author Image author
 * @param {string|null} data.link Image author's profile link
 */
async function setWall(data) {
  if (typeof data !== "object") return;

  applyFilter();

  const { image, isBlob, author, link } = data;

  if (!image) {
    isDebug && console.warn("no usable wallpaper data", data);
    return;
  }

  if (initCompleted) {
    await fadeOutWall();
  }

  initCompleted = true;

  elemImage.addEventListener(
    "load",
    () => {
      setTimeout(() => {
        fadeInWall();

        if (isBlob) {
          URL.revokeObjectURL(image);
        }
      }, 1);
    },
    { once: true }
  );

  elemImage.src = image;
  setCopyright(author, link);
}

/**
 * Set image source link and text
 *
 * @param {string|null} [text=null] Image author
 * @param {string|null} [url=null] Image author's profile link
 * @returns
 */
function setCopyright(text = null, url = null) {
  if (text === null && url === null) {
    hideSourcesLink();
    return;
  }

  elemCopyright.textContent = text
    ? translate("ntpCopyrightAuthor", text)
    : translate("ntpSourcesText");

  elemCopyright.href = url ?? CREDITS_LINK;

  showSourcesLink();
}

/**
 * Apply translation
 */
function applyLocale() {
  document.title = translate("ntpTitle");
  setCopyright();
}

/**
 * Start listener for runtime messaging
 */
function listenRuntimeMessage() {
  chrome.runtime.onMessage.addListener((message) => {
    if ("action" in message) {
      switch (message.action) {
        case "new-wallpaper":
          fetchWallpaper();
          break;
      }
    }
  });
}

/**
 * Apply filter
 */
async function applyFilter() {
  const darkenValue = await LS.get("local", "overlayDarken");
  if (darkenValue) {
    document.body.style.setProperty("--overlay-darken-opacity", darkenValue);
  }
}

/**
 * Set fallback image
 */
async function setFallbackWallpaper() {
  const wallpaper = fallbackImage;
  isDebug && console.log("setting fallback wallpaper", wallpaper);
  setWall(wallpaper);
}

/**
 * Get image from browser storage
 */
async function fetchWallpaper() {
  const savedWallpaper = await LS.get("local", "userWallpaper");
  if (!savedWallpaper) return setFallbackWallpaper();

  const blob = await fetch(savedWallpaper).then((d) => d.blob());
  const url = URL.createObjectURL(blob);

  setWall({
    image: url,
    isBlob: true,
    author: null,
    link: null,
  });
}

/**
 * Document ready event handler
 */
function docReady() {
  initElements();
  applyLocale();
  cleanUp();
  listenRuntimeMessage();
  fetchWallpaper();
}

/**
 * Clean old settings
 */
function cleanUp() {
  LS.del("local", "lastImage");
  LS.del("local", "currentImage");
  LS.del("local", "nextUpdate");
}

/**
 * Document loaded event
 */
document.addEventListener("DOMContentLoaded", () => docReady(), {
  once: true,
  passive: true,
});
