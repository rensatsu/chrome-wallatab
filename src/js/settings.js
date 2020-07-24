const settingsForm = document.getElementById("settings");
const inpFile = document.getElementById("inp-file");
const inpFileLabel = document.getElementById("inp-file-label");
const inpOverlayDarken = document.getElementById("inp-overlay-darken");
const inpOverlayDarkenLabel = document.getElementById(
  "inp-overlay-darken-label"
);
const imgPreview = document.getElementById("img-preview");
const btnReset = document.getElementById("btn-set-default");
const btnSave = document.getElementById("btn-save");

const IMAGE_OPTIMIZE_SIZE_THRESHOLD = 1.5 * 1024 * 1024;
const MIN_OPTIMIZE_WIDTH = 1920;
const OPTIMIZE_QUALITY = 0.9;

let imageData = null;

/**
 * An alias for `chrome.i18n.getMessage`
 *
 * @param {string} key Translation strinng key
 * @param {any} substitutions Substitutions
 * @returns {string}
 */
function translate(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions);
}

/**
 * Notification message class
 *
 * @class Message
 */
class Message {
  /**
   * Creates a new notification message
   * @param {string} text Notification message text
   * @param {number} [timeout=3000] Timeout, 0 to disable
   * @memberof Message
   */
  constructor(text, timeout = 3000) {
    const message = document.createElement("div");
    const messageWrapper = document.getElementById("message-wrapper");
    message.classList.add("message");
    message.textContent = text;

    this.message = message;

    if (timeout > 0) {
      setTimeout(() => this.hide(), timeout);
    }

    message.addEventListener("click", (e) => {
      e.preventDefault();
      this.hide();
    });

    messageWrapper.append(message);
  }

  /**
   * Hide and remove message
   *
   * @memberof Message
   */
  hide() {
    this.message.remove();
  }
}

/**
 * Convert a file (Blob) to Base64
 *
 * @param {Blob} file File
 * @returns {string}
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Resize an image file and output as Base64
 *
 * @param {Blob} file Image file
 * @param {Number} maxWidth Max width of the output image
 * @returns {string} Base64 encoded image
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
 * Load preview image
 *
 * @param {string|null} [image=null]
 */
function loadPreviewImage(image = null) {
  imgPreview.src = image;
  imageData = image;
}

/**
 * Save settings
 */
async function save() {
  if (imageData !== null) {
    await LS.set("local", "userWallpaper", imageData);
  } else {
    await LS.del("local", "userWallpaper");
  }

  await LS.set("local", "overlayDarken", inpOverlayDarken.value);

  chrome.runtime.sendMessage({ action: "new-wallpaper" });
  new Message(translate("settingsSaved"));
}

/**
 * Handle file select event
 *
 * @param {Blob} file Selected file
 */
async function handleFile(file) {
  let img = null;

  // max of [threshold, screen width]
  const optWidth = Math.max(MIN_OPTIMIZE_WIDTH, window.screen.width);

  if (file.size > IMAGE_OPTIMIZE_SIZE_THRESHOLD) {
    // optimizing big files
    const msg = new Message(translate("settingsMessageOptimize"), 0);
    img = await resizeImage(file, optWidth);
    msg.hide();
  } else {
    // not optimizing small files, only reading
    img = await fileToBase64(file);
  }

  loadPreviewImage(img);
}

/**
 * File selection changed
 */
inpFile.addEventListener("input", function (e) {
  e.preventDefault();
  if (this.files.length > 0) {
    handleFile(this.files[0]).then(() => (this.value = null));
  }
});

/**
 * Reset button clicked
 */
btnReset.addEventListener("click", function (e) {
  e.preventDefault();
  imgPreview.hidden = true;
  loadPreviewImage(null);
  inpFile.value = null;

  save();
});

/**
 * Image preview loaded
 */
imgPreview.addEventListener("load", function () {
  this.hidden = false;
});

/**
 * Image preview failed to load
 */
imgPreview.addEventListener("error", function () {
  this.hidden = true;
});

/**
 * Document loaded event
 */
document.addEventListener("DOMContentLoaded", function () {
  const loadWall = LS.get("local", "userWallpaper");
  const loadOverlayDarken = LS.get("local", "overlayDarken");

  // waiting for all settings requests to resolve
  Promise.all([loadWall, loadOverlayDarken]).then(([img, overlay]) => {
    loadPreviewImage(img);

    if (overlay === null) overlay = 0.5;
    inpOverlayDarken.value = overlay;

    settingsForm.hidden = false;
  });

  // applying translations
  document.title = translate("settingsTitle");
  btnReset.textContent = translate("settingsBtnReset");
  btnSave.textContent = translate("settingsBtnSave");
  inpOverlayDarkenLabel.textContent = translate("settingsLabelOverlayDarken");
  inpFileLabel.textContent = translate("settingsLabelFile");
});

/**
 * Save button handler
 */
settingsForm.addEventListener("submit", function (e) {
  e.preventDefault();
  save();
});
