import { STORAGE_PREFIX } from "./constants.js";
import { Storage } from "./storage.js";
const LS = new Storage(STORAGE_PREFIX);
export { LS };
