import "./style.css";
import Phaser from "phaser";
import { getLevelScene, isPWA } from "./util";
import "./pwa";
const lvl = getLevelScene();
window.addEventListener("load", () => {
    if (isPWA()) {
        const orientation: any = screen.orientation;
        orientation.lock("landscape").catch(() => {});
    }
    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        backgroundColor: "#1e1e1e",
        physics: {
            default: "arcade",
            arcade: {
                gravity: { x: 0, y: 800 },
                debug: false,
            },
        },
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [lvl],
    };
    new Phaser.Game(config);
});
