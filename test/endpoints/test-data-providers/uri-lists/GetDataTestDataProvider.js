import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TestDataProvider } from "../interface.js";
import { ENDPOINT_KEYS } from "../../constants.js";
import { extractDataParamsFromUrl } from '../../utils.js';

export class GetDataTestDataProvider extends TestDataProvider {}

