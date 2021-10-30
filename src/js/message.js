/**
 * Notification message class.
 * @class Message.
 */
class Message {
  /**
   * HTML element for Message.
   * @type {HTMLElement}
   * @memberof Message
   */
  #message;

  /**
   * Creates a new notification message.
   * @param {string} text Notification message text.
   * @param {number} [timeout=3000] Timeout, 0 to control manually.
   * @memberof Message
   */
  constructor(text, timeout = 3000) {
    const message = document.createElement("div");
    const messageWrapper = document.getElementById("message-wrapper");
    message.classList.add("message");
    message.textContent = text;

    this.#message = message;

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
   * Hide and remove message.
   * @memberof Message
   */
  hide() {
    this.#message.remove();
  }
}

export { Message };
