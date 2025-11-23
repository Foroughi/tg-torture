import { BaseGameScene } from "../scene";

export class Test_Scene extends BaseGameScene {
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

    override createBlocks() {
        this.drawStaticBlock(0, this.MaxHeight - 2, this.MaxWidth, 1);
        this.createTrap1();
    }

    createTrap1() {
        const trap = this.physics.add.group({
            allowGravity: false,
            immovable: false,
        });

        const tile = this.getBlock(14, this.MaxHeight - 2) as Phaser.GameObjects.Sprite;

        const dyn = this.physics.add.sprite(tile.x, tile.y, tile.texture.key, tile.frame.name).setScale(tile.scaleX, tile.scaleY).setOrigin(tile.originX, tile.originY);
        dyn.refreshBody();
        trap.add(dyn);

        this.setBlock(14, this.MaxHeight - 2, dyn);

        const triggerZone = this.createTriggerZone(13, this.MaxHeight - 10, 2, 10);

        this.physics.add.overlap(this.player, triggerZone, () => {
            this.tweens.add({
                targets: trap.getChildren(),
                y: "+=20",
                duration: 10,
                ease: "Linear",
            });
        });
    }
}
