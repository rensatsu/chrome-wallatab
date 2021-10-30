/**
 * Convert a file (Blob) to Base64.
 *
 * @param {Blob} file File.
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

export { fileToBase64 };
