import { BaseGameScene } from "../scene";

export class Level_1 extends BaseGameScene {
    constructor() {
        super();
    }
    preload() {
        super.preload();
    }

    create() {
        super.create();
    }

    update() {
        super.update();
    }

    protected createPlayer() {
        super.createPlayer();
    }

    override createDoor() {
        super.createDoor();
    }

    override onResize(gameSize: Phaser.Structs.Size): void {
        super.onResize(gameSize);
    }

    override createBlocks() {
        this.drawStaticBlock(0, this.MaxHeight - 1, this.MaxWidth, 1);
    }
}
