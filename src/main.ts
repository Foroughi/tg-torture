import "./style.css";
import Phaser from "phaser";
import { getLevelScene } from "./util";
import "./pwa";
const lvl = getLevelScene();

window.addEventListener("load", () => {
    const orientation: any = screen.orientation;

    if (orientation && orientation.lock) {
        orientation.lock("landscape").catch(() => {});
    }

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: "#1e1e1e",
        physics: {
            default: "arcade",
            arcade: {
                gravity: { x: 0, y: 800 },
                debug: false,
            },
        },
        scene: [lvl],
    };
    new Phaser.Game(config);
});
