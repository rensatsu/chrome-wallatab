((w, d) => {
  const ANIMATION_FAST = 100;
  const ANIMATION_SLOW = 250;

  const creditsLink =
    "https://github.com/rensatsu/chrome-wallatab#images-credits";

  const fallbackImages = [
    {
      image: "img/fallback/1.webp",
      author: "Nathan Anderson",
      link: "https://unsplash.com/@nathananderson",
    },
  ];

  let initCompleted = false;

  let elemImage, elemCopyright, elemOverlay, elemSettingsBtn;

  // Control output of debug information
  // To enable:
  // `chrome.storage.local.set({ wntp_debug: true });`
  let isDebug = false;
  LS.get("local", "debug").then((d) => (isDebug = !!d));

  function initElements() {
    elemImage = document.createElement("img");
    elemImage.classList.add("fs");
    elemImage.id = "image";

    elemImage.addEventListener("error", () => fetchWallpaper());

    elemOverlay = document.createElement("div");
    elemOverlay.classList.add("fs");
    elemOverlay.id = "overlay";

    elemCopyright = document.createElement("a");
    elemCopyright.target = "_blank";
    elemCopyright.href = "about:blank";
    elemCopyright.id = "sources";
    elemCopyright.hidden = true;

    elemSettingsBtn = document.createElement("button");
    elemSettingsBtn.type = "button";
    elemSettingsBtn.id = "btn-settings";
    elemSettingsBtn.title = chrome.i18n.getMessage("settingsTitle");
    elemSettingsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    fetch(chrome.runtime.getURL("img/settings.svg"))
      .then((d) => d.text())
      .then((d) => {
        elemSettingsBtn.innerHTML = d;
      });

    document.body.append(
      elemImage,
      elemOverlay,
      elemCopyright,
      elemSettingsBtn
    );
  }

  function animateImage(keyframes, duration, cb) {
    const anim = elemImage.animate(keyframes, {
      duration: duration,
      fill: "forwards",
      easing: "ease-in-out",
    });

    anim.addEventListener("finish", () => cb());
  }

  function fadeInWall() {
    return new Promise((resolve) => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];

      animateImage(keyframes, ANIMATION_SLOW, resolve);
    });
  }

  function fadeOutWall() {
    return new Promise((resolve) => {
      const keyframes = [{ opacity: 1 }, { opacity: 0 }];

      animateImage(keyframes, ANIMATION_FAST, resolve);
    });
  }

  function showSourcesLink() {
    elemCopyright.hidden = false;
  }

  function hideSourcesLink() {
    elemCopyright.hidden = true;
  }

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
          imageLoaded = true;

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

  function setCopyright(text = null, url = null) {
    if (text === null && url === null) {
      hideSourcesLink();
      return;
    }

    elemCopyright.textContent = text
      ? chrome.i18n.getMessage("ntpCopyrightAuthor") + text
      : chrome.i18n.getMessage("ntpSourcesText");

    elemCopyright.href = url ?? creditsLink;

    showSourcesLink();
  }

  function applyLocale() {
    d.title = chrome.i18n.getMessage("ntpTitle");
    setCopyright();
  }

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

  async function applyFilter() {
    const darkenValue = await LS.get("local", "overlayDarken");
    if (darkenValue) {
      document.body.style.setProperty("--overlay-darken-opacity", darkenValue);
    }

    const blurValue = await LS.get("local", "overlayBlur");
    if (blurValue) {
      document.body.style.setProperty("--overlay-blur-radius", blurValue);
    }
  }

  async function setFallbackWallpaper() {
    const wallpaper = fallbackImages[0];
    isDebug && console.log("setting fallback wallpaper", wallpaper);
    setWall(wallpaper);
  }

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

  function docReady() {
    initElements();
    applyLocale();
    cleanUp();
    listenRuntimeMessage();
    fetchWallpaper();
  }

  function cleanUp() {
    LS.del("local", "lastImage");
    LS.del("local", "currentImage");
    LS.del("local", "nextUpdate");
  }

  w.addEventListener("DOMContentLoaded", () => docReady(), {
    once: true,
    passive: true,
  });
})(window, document);
