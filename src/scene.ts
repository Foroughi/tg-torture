import Phaser from "phaser";
import { getDeath, getLevel, increaseDeath, isPWA, nextLevel, type GameStatus } from "./util";
import { DEBUG, DEVMOD } from "./util";

export abstract class BaseGameScene extends Phaser.Scene {
    player!: Phaser.Physics.Arcade.Sprite;
    door!: Phaser.Physics.Arcade.Sprite;
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    border!: Phaser.Physics.Arcade.StaticGroup;
    bg!: Phaser.Physics.Arcade.StaticGroup;
    status: GameStatus = "inprogress";
    events = new Phaser.Events.EventEmitter();

    blocks: (Phaser.GameObjects.GameObject | null)[][] = [];

    sounds: any = {};

    readonly general_scale: number = 1;
    readonly MaxWidthSize = (isPWA() ? window.innerHeight : window.innerWidth) / this.general_scale;
    readonly MaxHeightSize = (isPWA() ? window.innerWidth : window.innerHeight) / this.general_scale;
    readonly tile_size = 16 * this.general_scale;

    readonly MaxWidth = Math.floor(this.MaxWidthSize / this.tile_size);
    readonly MaxHeight = Math.floor(this.MaxHeightSize / this.tile_size);

    constructor() {
        super("Scene");

        for (var i = 0; i < this.MaxWidth; i++) {
            this.blocks[i] = [];
            for (var j = 0; j < this.MaxHeight; j++) this.blocks[i][j] = null;
        }
    }

    preload() {
        this.load.image("bg", "./bg.png");
        this.load.spritesheet("terrain", "./terrain.png", { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet("player_idle", "./player_ideal.png", { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet("player_walk", "./player_walk.png", { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet("player_fall", "./player_fall.png", { frameWidth: 32, frameHeight: 32 });
        this.load.image("door", "./door.png");
        this.load.spritesheet("player_appear", "./player_appear.png", { frameWidth: 96, frameHeight: 96 });
        this.load.spritesheet("player_disappear", "./player_disappear.png", { frameWidth: 96, frameHeight: 96 });

        this.load.audio("walk", "./walk.wav");
        this.load.audio("fail", "./fail.wav");
        this.load.audio("victory", "./victory.wav");
        this.load.audio("fall", "./fall.wav");
        this.load.audio("jump", "./jump.wav");
        this.load.audio("bg", "./bg.wav");

        for (var i = 0; i <= 9; i++) {
            var lvl = i.toString();
            lvl = "0" + lvl;
            this.load.image(`number_${lvl}`, `./levels/${lvl}.png`);
        }
    }

    init_() {
        this.sounds["victory"] = this.sound.add("victory", {
            loop: false,
            volume: 1,
        });

        this.sounds["fail"] = this.sound.add("fail", {
            loop: false,
            volume: 1,
        });
        this.sounds["walk"] = this.sound.add("walk", {
            loop: true,
            volume: 0.1,
        });

        this.sounds["bg"] = this.sound.add("bg", {
            loop: true,
            volume: 0.3,
        });
        this.sounds["fall"] = this.sound.add("fall", {
            loop: false,
            volume: 0.5,
        });

        this.sounds["jump"] = this.sound.add("jump", {
            loop: false,
            volume: 0.5,
        });
    }

    create() {
        this.status = "inprogress";

        if (DEBUG) this.physics.world.createDebugGraphic();

        this.createBorder();

        this.createDoor();
        this.createPlayer();
        this.createBlocks();
        this.drawLevel();
        this.drawDeaths();

        for (var i = 0; i < this.blocks.length; i++) {
            this.physics.add.collider(this.player, this.blocks[i]);
            this.physics.add.collider(this.door, this.blocks[i]);
        }

        this.init_();

        this.physics.add.overlap(
            this.player,
            this.door,
            () => {
                if (this.status != "inprogress") return;

                this.status = "won";
                this.player.setVelocity(0);
                this.player.body.enable = false;

                this.player.emit("won");
            },
            null,
            this,
        );

        this.player.on("failed", () => {
            this.sounds["fall"].stop();
            if (!this.sounds["fail"].isPlaying) this.sounds["fail"].play();
            this.time.delayedCall(3000, () => {
                increaseDeath();
                this.scene.restart();
            });
        });

        this.player.on("won", () => {
            this.sound.stopAll();
            if (!this.sounds["victory"].isPlaying) this.sounds["victory"].play();

            this.time.delayedCall(500, () => {
                this.player.anims.play("player_disappear", true);
                this.player.on("animationcomplete", () => {
                    this.player.setVisible(false);
                });
            });
            this.time.delayedCall(4000, () => {
                if (DEVMOD) nextLevel();
                this.scene.restart();
            });
        });

        this.cursors = this.input.keyboard.createCursorKeys();

        this.anims.create({
            key: "idle",
            frames: this.anims.generateFrameNumbers("player_idle"),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: "fall",
            frames: this.anims.generateFrameNumbers("player_fall"),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: "walk",
            frames: this.anims.generateFrameNumbers("player_walk"),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: "player_appear",
            frames: this.anims.generateFrameNumbers("player_appear"),
            frameRate: 10,
            repeat: 0,
        });

        this.anims.create({
            key: "player_disappear",
            frames: this.anims.generateFrameNumbers("player_disappear"),
            frameRate: 10,
            repeat: 0,
        });
    }

    update() {
        var isWalking = false;
        var isFalling = false;
        var isJumping = false;

        if (this.status == "inprogress") {
            if (!this.sounds["bg"].isPlaying) this.sounds["bg"].play();

            if (this.player.y > this.physics.world.bounds.height + 100) {
                this.status = "failed";
                this.player.emit("failed");
                return;
            }
            const p = this.player;
            p.setVelocityX(0);
            if (this.cursors.left.isDown) {
                p.setVelocityX(-200);
                p.flipX = true; // face left
                if (p.body.blocked.down) {
                    p.anims.play("walk", true);
                    isWalking = true;
                    this.sound.unlock();
                    if (!this.sounds["walk"].isPlaying) this.sounds["walk"].play();
                }
            } else if (this.cursors.right.isDown) {
                p.setVelocityX(200);
                p.flipX = false; // face right
                if (p.body.blocked.down) {
                    p.anims.play("walk", true);

                    isWalking = true;
                    this.sound.unlock();
                    if (!this.sounds["walk"].isPlaying) this.sounds["walk"].play();
                }
            } else if (p.body.blocked.down) {
                p.anims.play("idle", true); // << your idle frame/animation
            }
            if (this.cursors.up.isDown && p.body.blocked.down) {
                p.setVelocityY(-400);
            }
            if (!p.body.blocked.down && p.body.velocity.y > 280) {
                p.anims.play("fall", true); // << your idle frame/animation

                if (!isJumping) {
                    isFalling = true;
                    this.sound.unlock();
                    if (!this.sounds["fall"].isPlaying) this.sounds["fall"].play();
                }
            }

            if (!p.body.blocked.down && p.body.velocity.y <= 0) {
                isJumping = true;
                this.sound.unlock();
                if (!this.sounds["jump"].isPlaying) this.sounds["jump"].play();
            }

            if (!isWalking) if (this.sounds["walk"].isPlaying) this.sounds["walk"].stop();
            if (!isJumping) if (this.sounds["jump"].isPlaying) this.sounds["jump"].stop();
            if (!isFalling) if (this.sounds["fall"].isPlaying) this.sounds["fall"].stop();
        } else {
            if (this.sounds["bg"].isPlaying) this.sounds["bg"].stop();
        }
    }

    protected createDoor() {
        this.door = this.physics.add.sprite(1600, 100, "door").setScale(1.5);
        this.physics.add.collider(this.door, this.border);
        const w = this.door.width;
        const h = this.door.height;
        this.door.setDepth(5);
        this.door.setSize(1, 20);
        this.door.setOffset(w / 2, (h - 23) / 2);
    }

    protected createPlayer() {
        this.player = this.physics.add.sprite(100, 100, "player_idle", 1);
        this.player.setGravityY(400);
        this.physics.add.collider(this.player, this.border);
        this.player.setDepth(10);

        const w = this.player.width;
        const h = this.player.height;

        this.player.setSize(2, 32);
        this.player.setOffset((w - 5) / 2, (h - 36) / 2);
    }

    protected createBlocks() {}

    /*
            function setTraps(this) {
                var trapsInfo = [
                    {
                        x: 16,
                        y: 20,
                        w: 1,
                        h: 3,
                    },
                ];

                var scale = 2;
                var size = 16;
                var tile_size = scale * size;

                this.traps = this.physics.add.group();

                for (let t = 0; t < trapsInfo.length; t++) {
                    let trap = trapsInfo[t];

                    let startX = trap.x;
                    let startY = trap.y;
                    let w = trap.w;
                    let h = trap.h;

                    var trap1 = this.physics.add.group();

                    for (let i = 0; i < startX + w; i++) {
                        for (let j = 0; j < startY + h; j++) {
                            let gridX = startX + i;
                            let gridY = startY + j;
                            let tile = this.blockMap[gridX][gridY];

                            const { x, y, texture, frame, scaleX, scaleY, originX, originY } = tile;

                            tile.destroy();

                            let dyn = trap.add.sprite(x, y, texture.key, frame.name);
                            dyn.setScale(scaleX, scaleY);
                            dyn.setOrigin(originX, originY);
                            dyn.refreshBody?.();

                            this.blockMap[gridX][gridY] = dyn;
                        }
                    }

                    trap1.setAllowGravity(false);
                    trap1.setImmovable(true);

                    var triggerZone = this.add.zone((x + i - 1) * tile_size, (y + j - 1) * tile_size, (bi.w + 2) * tile_size, (bi.h + 2) * tile_size).setOrigin(0, 0);
                    this.physics.world.enable(triggerZone);
                    triggerZone.body.setAllowGravity(false);
                    triggerZone.body.setImmovable(true);

                    this.physics.add.overlap(
                        this.player,
                        triggerZone,
                        () => {
                            trapSprite.body.setAllowGravity(true);
                            trapSprite.body.setImmovable(false);
                        },
                        null,
                        this,
                    );
                }
            }

                    */
    private createBorder() {
        this.border = this.physics.add.staticGroup();
        this.bg = this.physics.add.staticGroup();

        var scale = 2;
        var size = 16;
        var tile_size = scale * size;
        var maxWidth = Math.floor(window.innerWidth / tile_size);
        var maxHeight = Math.floor(window.innerHeight / tile_size);

        for (var i = 0; i < maxWidth; i++) {
            for (var j = 0; j < maxHeight; j++) {
                if (j == 0 && i == maxWidth - 1) {
                    this.border
                        .create(i * tile_size, j * tile_size, "terrain", 90)
                        .setScale(scale)
                        .setOrigin(0, 0)
                        .setDepth(0)
                        .refreshBody();
                } else if (i == 0 && j == 0) {
                    this.border.create(i, j, "terrain", 88).setScale(scale).setOrigin(0, 0).setDepth(0);
                } else if (j == 0) {
                    this.border
                        .create(i * tile_size, j * tile_size, "terrain", 89)
                        .setScale(scale)
                        .setOrigin(0, 0)
                        .setDepth(0)
                        .refreshBody();
                } else if (i == 0) {
                    this.border
                        .create(i * tile_size, j * tile_size, "terrain", 110)
                        .setScale(scale)
                        .setOrigin(0, 0)
                        .setDepth(0)
                        .refreshBody();
                } else if (i == maxWidth - 1) {
                    this.border
                        .create(i * tile_size, j * tile_size, "terrain", 112)
                        .setScale(scale)
                        .setOrigin(0, 0)
                        .setDepth(0)
                        .refreshBody();
                } else {
                    this.bg
                        .create(i * tile_size, j * tile_size, "terrain", 111)
                        .setScale(scale)
                        .setOrigin(0, 0)
                        .setDepth(0)
                        .refreshBody();
                }
            }
        }
    }

    private drawDeaths() {
        var deathBlock = this.physics.add.staticGroup();

        var death = getDeath();
        var startLocation = window.innerWidth - death.length * 29 - 32;

        for (var i = 0; i < death.length; i++) {
            deathBlock
                .create(29 * i + startLocation, 20, "number_0" + death[i], 90)
                .setTint(0xff0000)
                .setScale(1.5)
                .setOrigin(0, 0)
                .setDepth(0)
                .refreshBody();
        }
    }

    private drawLevel() {
        var lvlBlock = this.physics.add.staticGroup();

        var lvl = getLevel().toString();

        for (var i = 0; i < lvl.length; i++) {
            lvlBlock
                .create(29 * i + 22, 20, "number_0" + lvl[i], 90)
                .setScale(1.5)
                .setOrigin(0, 0)
                .setDepth(0)
                .refreshBody();
        }
    }

    getBlock(x: number, y: number): Phaser.GameObjects.GameObject {
        return this.blocks[x][y];
    }

    setBlock(x: number, y: number, block: Phaser.GameObjects.GameObject) {
        if (this.blocks[x][y]) this.blocks[x][y].destroy();
        this.blocks[x][y] = block;
    }

    createTriggerZone(x: number, y: number, w: number, h: number) {
        const triggerZone = this.add.rectangle(x * this.tile_size, y * this.tile_size, w * this.tile_size, h * this.tile_size, 0xff0000, DEBUG ? 0.2 : 0).setOrigin(0, 0);
        this.physics.add.existing(triggerZone, true);
        return triggerZone;
    }

    drawStaticBlock(x: number, y: number, w: number, h: number) {
        var blocks = this.physics.add.staticGroup();

        for (var i = 0; i < w; i++) {
            for (var j = 0; j < h; j++) {
                var t = 29;

                if (i == 0 && j == 0) t = 6;
                else if (i == w - 1 && j == 0) t = 8;
                else if (j == h - 1 && i == 0) t = 50;
                else if (i == 0 && j > 0 && j < h - 1) t = 28;
                else if (j == 0 && i > 0 && i < w - 1) t = 7;
                else if (i == w - 1 && j > 0 && j < h - 1) t = 30;
                else if (j == h - 1 && i > 0 && i < w - 1) t = 51;
                else if (i == w - 1 && j == h - 1) t = 52;

                var obj = blocks
                    .create((x + i) * this.tile_size, (y + j) * this.tile_size, "terrain", t)
                    .setScale(this.general_scale)
                    .setOrigin(0, 0)
                    .setDepth(0);

                obj.refreshBody();

                this.setBlock(x + i, y + j, obj);
            }
        }
    }
}
