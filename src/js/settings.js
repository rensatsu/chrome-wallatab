import { LS } from "./ls.js";
import { translate } from "./translate.js";
import { Message } from "./message.js";
import { fileToBase64 } from "./file-reader.js";
import {
  IMAGE_OPTIMIZE_SIZE_THRESHOLD,
  MIN_OPTIMIZE_WIDTH,
  OPTIMIZE_QUALITY,
} from "./constants.js";

const settingsForm = document.getElementById("settings");
const inpFile = document.getElementById("inp-file");
const inpFileLabel = document.getElementById("inp-file-label");
const inpFileOverlayLabel = document.getElementById("btn-overlay-chooser");
const inpOverlayDarken = document.getElementById("inp-overlay-darken");
const inpOverlayDarkenLabel = document.getElementById(
  "inp-overlay-darken-label"
);
const imgPreview = document.getElementById("img-preview");
const btnReset = document.getElementById("btn-set-default");

let imageData = null;

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
 * Load preview image.
 *
 * @param {string|null} [image=null]
 */
function loadPreviewImage(image = null) {
  imageData = image;
  if (image === null) return;
  imgPreview.src = image;
}

/**
 * Save settings.
 * @param {string[]} items An array of settings items to save.
 */
async function save(items = ["userWallpaper", "overlayDarken"]) {
  if (items.includes("userWallpaper")) {
    if (imageData !== null) {
      await LS.set("local", "userWallpaper", imageData);
    } else {
      await LS.del("local", "userWallpaper");
    }

    new Message(translate("imageSaved"));
  }

  if (items.includes("overlayDarken")) {
    await LS.set("local", "overlayDarken", inpOverlayDarken.value);
  }

  chrome.runtime.sendMessage({ action: "new-wallpaper" });
}

/**
 * Handle file select event.
 *
 * @param {Blob} file Selected file.
 */
async function handleFile(file) {
  let img = null;

  // max of [threshold, screen width]
  const optWidth = Math.max(MIN_OPTIMIZE_WIDTH, window.screen.width);

  if (file.size > IMAGE_OPTIMIZE_SIZE_THRESHOLD) {
    // optimizing big files
    const msg = new Message(translate("settingsMessageOptimize"), 0);
    img = await resizeImage(file, optWidth).catch(() => {
      // handling exceptions during optimization
      new Message(translate("settingsMessageUnableToOptimize"));
      msg.hide();
      return null;
    });

    msg.hide();
  } else {
    // not optimizing small files, only reading
    img = await fileToBase64(file);
  }

  if (img !== null) {
    // skip bad image
    loadPreviewImage(img);
    save("userWallpaper");
  }
}

/**
 * File selection changed.
 */
inpFile.addEventListener("input", function (e) {
  e.preventDefault();
  if (this.files.length === 0) return;
  handleFile(this.files[0]).then(() => (this.value = null));
});

/**
 * Reset button clicked.
 */
btnReset.addEventListener("click", function (e) {
  e.preventDefault();
  imgPreview.hidden = true;
  loadPreviewImage(null);
  inpFile.value = null;

  save();
});

/**
 * Image preview loaded.
 */
imgPreview.addEventListener("load", function () {
  this.hidden = false;
});

/**
 * Image preview failed to load.
 */
imgPreview.addEventListener("error", function () {
  this.hidden = true;
});

/**
 * Document loaded event.
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
  btnReset.title = translate("settingsBtnReset");
  inpOverlayDarkenLabel.textContent = translate("settingsLabelOverlayDarken");
  inpFileLabel.textContent = translate("settingsLabelFile");
  inpFileOverlayLabel.title = translate("settingsLabelFile");
});

/**
 * Overlay filter input handler.
 */
inpOverlayDarken.addEventListener("change", function (e) {
  e.preventDefault();
  save("overlayDarken");
});

/**
 * Save button handler.
 */
settingsForm.addEventListener("submit", function (e) {
  e.preventDefault();
  save();
});
