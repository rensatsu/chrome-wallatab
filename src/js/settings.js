const settingsForm = document.getElementById("settings");
const inpFile = document.getElementById("inp-file");
const inpFileLabel = document.getElementById("inp-file-label");
const inpOverlayDarken = document.getElementById("inp-overlay-darken");
const inpOverlayDarkenLabel = document.getElementById(
  "inp-overlay-darken-label"
);
const inpOverlayBlur = document.getElementById("inp-overlay-blur");
const inpOverlayBlurLabel = document.getElementById("inp-overlay-blur-label");
const imgPreview = document.getElementById("img-preview");
const btnReset = document.getElementById("btn-set-default");
const btnSave = document.getElementById("btn-save");

let imageData = null;

class Message {
  constructor(text, timeout = 3000) {
    const message = document.createElement("div");
    const messageWrapper = document.getElementById("message-wrapper");
    message.classList.add("message");
    message.textContent = text;

    setTimeout(() => {
      message.remove();
    }, timeout);

    message.addEventListener("click", (e) => {
      e.preventDefault();
      message.remove();
    });

    messageWrapper.append(message);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function loadPreviewImage(image = null) {
  imgPreview.src = image;
  imageData = image;
}

async function save() {
  if (imageData !== null) {
    await LS.set("local", "userWallpaper", imageData);
  } else {
    await LS.del("local", "userWallpaper");
  }

  await LS.set("local", "overlayDarken", inpOverlayDarken.value);
  await LS.set("local", "overlayBlur", inpOverlayBlur.value);

  chrome.runtime.sendMessage({ action: "new-wallpaper" });
  new Message(chrome.i18n.getMessage("settingsSaved"));
}

inpFile.addEventListener("input", function (e) {
  e.preventDefault();
  if (this.files.length > 0) {
    fileToBase64(this.files[0]).then((img) => {
      loadPreviewImage(img);
      this.value = null;
    });
  }
});

btnReset.addEventListener("click", function (e) {
  e.preventDefault();
  imgPreview.hidden = true;
  loadPreviewImage(null);
  inpFile.value = null;

  save();
});

imgPreview.addEventListener("load", function () {
  this.hidden = false;
});

imgPreview.addEventListener("error", function () {
  this.hidden = true;
});

document.addEventListener("DOMContentLoaded", function () {
  const loadWall = LS.get("local", "userWallpaper");
  const loadOverlayDarken = LS.get("local", "overlayDarken");
  const loadOverlayBlur = LS.get("local", "overlayBlur");

  const optsReq = [loadWall, loadOverlayDarken, loadOverlayBlur];

  Promise.all(optsReq).then(([img, overlay, ovBlur]) => {
    loadPreviewImage(img);

    if (overlay === null) overlay = 0.5;
    inpOverlayDarken.value = overlay;

    if (ovBlur === null) ovBlur = 0;
    inpOverlayBlur.value = ovBlur;

    settingsForm.hidden = false;
  });

  document.title = chrome.i18n.getMessage("settingsTitle");
  btnReset.textContent = chrome.i18n.getMessage("settingsBtnReset");
  btnSave.textContent = chrome.i18n.getMessage("settingsBtnSave");
  inpOverlayDarkenLabel.textContent = chrome.i18n.getMessage(
    "settingsLabelOverlayDarken"
  );
  inpOverlayBlurLabel.textContent = chrome.i18n.getMessage(
    "settingsLabelOverlayBlur"
  );
  inpFileLabel.textContent = chrome.i18n.getMessage("settingsLabelFile");
});

settingsForm.addEventListener("submit", function (e) {
  e.preventDefault();
  save();
});
