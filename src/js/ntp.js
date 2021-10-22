import { LS } from "./ls.js";
import { ANIMATION_FAST, ANIMATION_SLOW, CREDITS_LINK } from "./constants.js";
import { fallbackImage } from "./fallback-image.js";
import { getUILanguage, translate } from "./translate.js";

let initCompleted = false;

let elemImage, elemCopyright, elemSettingsBtn;

/**
 * Create and initialize required elements.
 */
function initElements() {
  // document language
  document.documentElement.lang = getUILanguage();

  // document title
  document.title = translate("ntpTitle");

  // image
  elemImage = document.querySelector("#image");
  elemImage.addEventListener("error", () => fetchWallpaper());
  elemImage.hidden = false;

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
 * Animation wrapper.
 *
 * @param {Array} keyframes Keyframes array.
 * @param {Number} duration Animation diration.
 * @returns {Promise<void>} Promise, which reolves when animation finishes.
 */
function animateImage(keyframes, duration) {
  return new Promise((resolve) => {
    const anim = elemImage.animate(keyframes, {
      duration: duration,
      fill: "forwards",
      easing: "ease-in-out",
    });

    anim.addEventListener("finish", () => resolve());
  });
}

/**
 * Fade-in animation.
 *
 * @returns {Promise<void>} Promise, which reolves when animation finishes.
 */
async function fadeInWall() {
  const keyframes = { opacity: [0, 1] };
  return animateImage(keyframes, ANIMATION_SLOW);
}

/**
 * Fade-out animation.
 *
 * @returns {Promise<void>} Promise, which reolves when animation finishes.
 */
async function fadeOutWall() {
  const keyframes = { opacity: [1, 0] };
  return animateImage(keyframes, ANIMATION_FAST);
}

/**
 * Show image source link.
 */
function showSourcesLink() {
  elemCopyright.hidden = false;
}

/**
 * Hide image source link.
 */
function hideSourcesLink() {
  elemCopyright.hidden = true;
}

/**
 * Set wallpaper image.
 *
 * @param {object} data Image data.
 * @param {string} data.image Image link.
 * @param {boolean} data.isBlob True when a link is a blob-url.
 * @param {string|null} data.author Image author.
 * @param {string|null} data.link Image author's profile link.
 */
async function setWall(data) {
  if (typeof data !== "object") return;

  applyFilter();

  const { image, isBlob, author, link } = data;

  if (!image) {
    console.warn("No usable wallpaper data", data);
    return;
  }

  if (initCompleted) {
    await fadeOutWall();
  }

  initCompleted = true;

  elemImage.addEventListener(
    "load",
    () => {
      requestAnimationFrame(async () => {
        await fadeInWall();
        if (isBlob) URL.revokeObjectURL(image);
      });
    },
    { once: true }
  );

  elemImage.src = image;
  setCopyright(author, link);
}

/**
 * Set image source link and text.
 *
 * @param {string|null} [author=null] Image author.
 * @param {string|null} [url=null] Image author's profile link.
 * @returns {void}
 */
function setCopyright(author = null, url = null) {
  if (author === null && url === null) {
    hideSourcesLink();
    return;
  }

  elemCopyright.textContent = author
    ? translate("ntpCopyrightAuthor", author)
    : translate("ntpSourcesText");

  elemCopyright.href = url ?? CREDITS_LINK;

  showSourcesLink();
}

/**
 * Start listener for runtime messaging.
 */
function listenRuntimeMessage() {
  chrome.runtime.onMessage.addListener((message) => {
    switch (message?.action) {
      case "new-wallpaper":
        fetchWallpaper();
        break;
    }
  });
}

/**
 * Apply filter.
 */
async function applyFilter() {
  const darkenValue = await LS.get("local", "overlayDarken");
  if (darkenValue) {
    document.body.style.setProperty("--overlay-darken-opacity", darkenValue);
  }
}

/**
 * Set fallback image.
 */
async function setFallbackWallpaper() {
  console.log("Setting fallback wallpaper", fallbackImage);
  setWall(fallbackImage);
}

/**
 * Get image from browser's storage.
 */
async function fetchWallpaper() {
  const savedWallpaper = await LS.get("local", "userWallpaper");
  if (!savedWallpaper) return setFallbackWallpaper();

  const blob = await fetch(savedWallpaper).then((d) => d.blob());
  const url = URL.createObjectURL(blob);

  setWall({
    image: url,
    isBlob: true,
  });
}

/**
 * Document ready event handler.
 */
function docReady() {
  initElements();
  setCopyright();
  cleanUp();
  listenRuntimeMessage();
  fetchWallpaper();
}

/**
 * Clean old settings.
 */
function cleanUp() {
  LS.del("local", "lastImage");
  LS.del("local", "currentImage");
  LS.del("local", "nextUpdate");
  LS.del("local", "debug");
}

/**
 * Document loaded event.
 */
document.addEventListener("DOMContentLoaded", () => docReady(), {
  once: true,
  passive: true,
});
