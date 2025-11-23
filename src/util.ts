import { levels } from "./levels";
import type { BaseGameScene } from "./scene";

export const DEBUG = false;
export const DEVMOD = true;

export function getLevel(): string {
    if (DEVMOD) return "0";

    const cookie = document.cookie.split("; ").find((row) => row.startsWith("level="));
    return cookie ? cookie.split("=")[1] : "1";
}

export function getDeath(): string {
    const cookie = document.cookie.split("; ").find((row) => row.startsWith("death="));

    return cookie ? cookie.split("=")[1] : "0";
}

export type GameStatus = "inprogress" | "failed" | "won";

export function getLevelScene(): BaseGameScene {
    const lvl = getLevel();
    var levelScene = levels[lvl];

    if (!levelScene) levelScene = levels["finish"];

    if (DEVMOD) levelScene = levels["test"];

    return levelScene;
}

export function increaseDeath() {
    const current = getDeath();
    var nextlevel = +current + 1;

    document.cookie = `death=${nextlevel}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

export function nextLevel() {
    const current = getLevel();
    var nextlevel = +current + 1;

    document.cookie = `level=${nextlevel}; path=/; max-age=${60 * 60 * 24 * 365}`;

    window.location.reload();
}

export function isPWA(): boolean {
    const standaloneDisplay = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = (window.navigator as any).standalone === true;

    return standaloneDisplay || iosStandalone;
}
