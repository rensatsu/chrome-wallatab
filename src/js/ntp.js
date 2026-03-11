import { LS } from "./ls.js";
import { ANIMATION_FAST, ANIMATION_SLOW, CREDITS_LINK } from "./constants.js";
import { fallbackImage } from "./fallback-image.js";
import { getUILanguage, translate } from "./translate.js";
import { Message } from "./message.js";
import { fileToBase64 } from "./file-reader.js";
import {
  IMAGE_OPTIMIZE_SIZE_THRESHOLD,
  MIN_OPTIMIZE_WIDTH,
  OPTIMIZE_QUALITY,
} from "./constants.js";

let initCompleted = false;

let elemImage, elemCopyright, elemSettingsBtn;
let elemDialog, elemCloseDialogBtn, elemSettingsForm;
let inpFile, inpOverlayDarken, btnReset;

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
    openSettingsDialog();
  });

  // loading an image for settings button
  fetch(chrome.runtime.getURL("img/settings.svg"))
    .then((d) => d.text())
    .then((d) => {
      elemSettingsBtn.innerHTML = d;
    });

  // Initialize dialog elements
  elemDialog = document.getElementById("settings-dialog");
  elemCloseDialogBtn = document.getElementById("btn-close-dialog");
  elemSettingsForm = document.getElementById("settings");

  // Initialize settings form elements
  inpFile = document.getElementById("inp-file");
  inpOverlayDarken = document.getElementById("inp-overlay-darken");
  btnReset = document.getElementById("btn-reset");

  // Setup dialog event listeners
  setupDialogListeners();
  setupSettingsListeners();
  checkAutoOpenDialog();
}

function setupDialogListeners() {
  // Close button
  elemCloseDialogBtn.addEventListener("click", () => {
    elemDialog.close();
  });

  // When dialog closes, clean up URL
  elemDialog.addEventListener("close", () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("action");
    history.replaceState("", document.title, url.pathname + url.search);
  });
}

/**
 * Open the settings dialog.
 */
function openSettingsDialog() {
  // Load current settings into form
  loadSettingsValues();

  // Show dialog as modal
  elemDialog.showModal();
}

/**
 * Check if dialog should auto-open (from options_ui).
 */
function checkAutoOpenDialog() {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get("action") === "settings") {
    // Slight delay to ensure DOM is ready
    setTimeout(() => {
      openSettingsDialog();
    }, 100);
  }
}

/**
 * Apply translations to settings elements.
 */
function applySettingsTranslations() {
  const settingsTitle = document.getElementById("settings-title");
  if (settingsTitle) {
    settingsTitle.textContent = translate("settingsTitle");
  }

  btnReset.title = "Reset to default wallpaper";
  document.getElementById("inp-overlay-darken-label").textContent =
    translate("settingsLabelOverlayDarken");
  document.getElementById("inp-file-label").textContent =
    translate("settingsLabelFile");
}

/**
 * Setup settings form event listeners.
 */
function setupSettingsListeners() {
  // File selection - saves immediately
  inpFile.addEventListener("input", async function (e) {
    e.preventDefault();
    if (this.files.length === 0) return;
    try {
      await handleFile(this.files[0]);
      new Message(translate("imageSaved"));
    } catch (err) {
      new Message(err.message);
    }
    this.value = null;
  });

  // Reset button - clears wallpaper immediately
  btnReset.addEventListener("click", async function (e) {
    e.preventDefault();
    await LS.del("local", "userWallpaper");
    fetchWallpaper();
    try {
      chrome.runtime.sendMessage({ action: "new-wallpaper" });
    } catch (_) { }
    new Message("Wallpaper reset to default");
  });

  // Overlay darken - real-time preview in current tab
  inpOverlayDarken.addEventListener("input", function (e) {
    document.body.style.setProperty("--overlay-darken-opacity", this.value);
  });

  // Overlay darken - save value and notify other tabs
  inpOverlayDarken.addEventListener("change", function (e) {
    LS.set("local", "overlayDarken", this.value);
    try {
      chrome.runtime.sendMessage({ action: "set-filter", name: "darken", value: this.value });
    } catch (_) { }
  });

  // Apply translations
  applySettingsTranslations();
}

/**
 * Load settings values into form.
 */
async function loadSettingsValues() {
  const savedOverlayDarken = await LS.get("local", "overlayDarken");
  inpOverlayDarken.value = savedOverlayDarken || 0.5;
}

/**
 * Resize an image file and output as Base64.
 *
 * @param {Blob} file Image file.
 * @param {Number} maxWidth Max width of the output image.
 * @returns {string} Base64 encoded image.
 */
function resizeImage(file, maxWidth) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;

    // create blob url for source file
    const imgBlobUrl = URL.createObjectURL(file);

    img.src = imgBlobUrl;
    img.addEventListener("load", () => {
      // revoke blob url
      URL.revokeObjectURL(imgBlobUrl);

      // calculate resize ratio
      const ratio = img.width > maxWidth ? maxWidth / img.width : 1;

      // resize canvas
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      // draw resized image
      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // output resized image as data url
      try {
        const resizedData = canvas.toDataURL("image/jpeg", OPTIMIZE_QUALITY);
        resolve(resizedData);
      } catch (e) {
        reject(e);
      }
    });

    img.addEventListener("error", (e) => reject(e));
  });
}

/**
 * Check if selected file is a supported and valid image.
 *
 * @param {Blob} file Selected file.
 * @returns {Promise<void>} Resolves when image is valid.
 */
function validateImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.addEventListener("load", () => {
      URL.revokeObjectURL(url);
      resolve();
    });

    img.addEventListener("error", (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    });

    img.src = url;
  });
}

/**
 * Handle file select event.
 *
 * @param {Blob} file Selected file.
 */
async function handleFile(file) {
  // Validate image
  await validateImage(file).catch(() => {
    throw new Error(translate("settingsMessageUnableToValidate"));
  });

  // Optimize if needed
  let img;
  const optWidth = Math.max(MIN_OPTIMIZE_WIDTH, window.screen.width);

  if (file.size > IMAGE_OPTIMIZE_SIZE_THRESHOLD) {
    const msg = new Message(translate("settingsMessageOptimize"), 0);
    img = await resizeImage(file, optWidth).catch(() => {
      msg.hide();
      throw new Error(translate("settingsMessageUnableToOptimize"));
    });
    msg.hide();
  } else {
    img = await fileToBase64(file);
  }

  // Save and apply immediately
  await LS.set("local", "userWallpaper", img);
  fetchWallpaper();
  try {
    chrome.runtime.sendMessage({ action: "new-wallpaper" });
  } catch (_) { }
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
      case "set-filter":
        applyFilter();
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
 * Clean old settings.
 */
function cleanUp() {
  LS.del("local", "lastImage");
  LS.del("local", "currentImage");
  LS.del("local", "nextUpdate");
  LS.del("local", "debug");
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
 * Document loaded event.
 */
document.addEventListener("DOMContentLoaded", () => docReady(), {
  once: true,
  passive: true,
});
