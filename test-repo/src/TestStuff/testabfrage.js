"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '../../.env' });
const backendConnection_1 = __importDefault(require("../backend/backendConnection"));
const norwegenId = process.env.NORWEGEN_RESOURCE_ID;
function printVertices() {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: vertices, error } = yield backendConnection_1.default
            .from("Location")
            .select("x_value, y_value")
            .eq("deskly_id", norwegenId);
        if (error) {
            console.log("Error:", error);
            return;
        }
        if (Array.isArray(vertices)) {
            console.log("vertices is an array");
            if (vertices.length > 0) {
                console.log("Type of the first element in vertices:", typeof vertices[0]);
                if (Array.isArray(vertices[0])) {
                    console.log("The first element is an array");
                }
            }
        }
        else {
            console.log("vertices is not an array");
        }
        console.log("Representation of vertices from the db:", vertices);
        console.log();
        console.log("x:", vertices[0].x_value);
        console.log("y:", vertices[0].y_value);
        //accessVertices(vertices);
    });
}
function calculateSomething() {
    return __awaiter(this, void 0, void 0, function* () {
        const factor = 1.553;
        const { data, error } = yield backendConnection_1.default
            .from("Location")
            .select("x_value")
            .eq("deskly_id", norwegenId);
        if (error) {
            console.error("Error fetching data:", error);
            return;
        }
        if (!data || data.length === 0) {
            console.log("No data found for the given deskly_id.");
            return;
        }
        // Extract x_value from the first object in the array
        const x_value = data[0].x_value;
        if (typeof x_value !== "number") {
            console.log("x_value is not a number:", x_value);
            return;
        }
        const result = x_value * factor;
        console.log("Ich bin das Result!", result);
    });
}
printVertices();
calculateSomething();
