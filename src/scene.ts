import Phaser from "phaser";
import { getDeath, getLevel, increaseDeath, nextLevel, type GameStatus } from "./util";
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
    general_scale: number = 1;
    tile_size = 16 * this.general_scale;
    MaxWidth = 0;
    MaxHeight = 0;
    offsetX = 0;
    offsetY = 0;

    touchActive = false;
    touchStartX = 0;
    touchStartY = 0;
    touchX = 0;
    touchY = 0;
    slideJumpTriggered = false;
    constructor() {
        super("Scene");
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

        this.applySize(this.scale.gameSize);
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

    applySize(gameSize: Phaser.Structs.Size) {
        const realW = gameSize.width;
        const realH = gameSize.height;
        this.MaxWidth = Math.floor(realW / this.tile_size);
        this.MaxHeight = Math.floor(realH / this.tile_size);

        const usedW = this.MaxWidth * this.tile_size;
        const usedH = this.MaxHeight * this.tile_size;

        this.offsetX = (realW - usedW) / 2;
        this.offsetY = (realH - usedH) / 2;

        console.log(this.offsetX);
        console.log(this.offsetY);
    }
    onResize(gameSize: Phaser.Structs.Size) {
        this.applySize(gameSize);
        this.scene.restart();
    }

    create() {
        this.status = "inprogress";
        this.touchActive = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchX = 0;
        this.touchY = 0;
        this.slideJumpTriggered = false;

        if (DEBUG) this.physics.world.createDebugGraphic();

        for (var i = 0; i < this.MaxWidth; i++) {
            this.blocks[i] = [];
            for (var j = 0; j < this.MaxHeight; j++) this.blocks[i][j] = null;
        }
        this.scale.on("resize", this.onResize, this);

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

        // this.input.addPointer(2); // allow 2 fingers

        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            this.touchActive = true;
            this.touchStartX = pointer.x;
            this.touchStartY = pointer.y;

            this.touchX = pointer.x;
            this.touchY = pointer.y;

            this.slideJumpTriggered = false; // reset jump state per touch
        });
        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;

            this.touchX = pointer.x;
            this.touchY = pointer.y;

            // SLIDE UP to jump → finger moved up more than 50px
            const dy = this.touchStartY - this.touchY;
            if (dy > 50) {
                this.slideJumpTriggered = true;
            } else {
                this.slideJumpTriggered = false;
            }
        });

        this.input.on("pointerup", () => {
            this.touchActive = false;
            this.slideJumpTriggered = false;
        });

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

            // default: stop movement
            p.setVelocityX(0);

            const moveLeft = this.cursors.left.isDown || (this.touchActive && this.touchX < this.scale.gameSize.width * 0.5 && this.touchY > this.scale.gameSize.height * 0.5);

            const moveRight = this.cursors.right.isDown || (this.touchActive && this.touchX >= this.scale.gameSize.width * 0.5 && this.touchY > this.scale.gameSize.height * 0.5);

            const jump = this.cursors.up.isDown || (this.touchActive && this.slideJumpTriggered);

            // LEFT
            if (moveLeft) {
                p.setVelocityX(-180);
                p.flipX = true;

                if (p.body.blocked.down) {
                    p.anims.play("walk", true);
                    isWalking = true;
                    this.sound.unlock();
                    if (!this.sounds["walk"].isPlaying) this.sounds["walk"].play();
                }
            }

            // RIGHT
            else if (moveRight) {
                p.setVelocityX(180);
                p.flipX = false;

                if (p.body.blocked.down) {
                    p.anims.play("walk", true);
                    isWalking = true;
                    this.sound.unlock();
                    if (!this.sounds["walk"].isPlaying) this.sounds["walk"].play();
                }
            }

            // IDLE
            else if (p.body.blocked.down) {
                p.anims.play("idle", true);
            }

            // JUMP
            if (jump && p.body.blocked.down) {
                p.setVelocityY(-400);
            }

            // FALLING
            if (!p.body.blocked.down && p.body.velocity.y > 280) {
                p.anims.play("fall", true);
                if (!isJumping) {
                    isFalling = true;
                    this.sound.unlock();
                    if (!this.sounds["fall"].isPlaying) this.sounds["fall"].play();
                }
            }

            // RISING
            if (!p.body.blocked.down && p.body.velocity.y <= 0) {
                isJumping = true;
                this.sound.unlock();
                if (!this.sounds["jump"].isPlaying) this.sounds["jump"].play();
            }

            // Stop sounds
            if (!isWalking) if (this.sounds["walk"].isPlaying) this.sounds["walk"].stop();
            if (!isJumping) if (this.sounds["jump"].isPlaying) this.sounds["jump"].stop();
            if (!isFalling) if (this.sounds["fall"].isPlaying) this.sounds["fall"].stop();
        } else {
            if (this.sounds["bg"].isPlaying) this.sounds["bg"].stop();
        }
    }

    protected createDoor() {
        this.door = this.physics.add.sprite(this.getPositionX(-2), this.getPositionY(1), "door").setScale(1.5);
        this.physics.add.collider(this.door, this.border);
        const w = this.door.width;
        const h = this.door.height;
        this.door.setDepth(5);
        this.door.setSize(1, 20);
        this.door.setOffset(w / 2, (h - 23) / 2);
    }

    protected createPlayer() {
        this.player = this.physics.add.sprite(this.getPositionX(2), this.getPositionY(1), "player_idle", 1);
        this.player.setGravityY(400);
        this.physics.add.collider(this.player, this.border);
        this.player.setDepth(10);

        const w = this.player.width;
        const h = this.player.height;

        this.player.setSize(2, 32);
        this.player.setOffset((w - 3) / 2, (h - 36) / 2);
    }

    protected createBlocks() {}

    private createBorder() {
        this.border = this.physics.add.staticGroup();
        this.bg = this.physics.add.staticGroup();

        for (var i = 0; i < this.MaxWidth; i++) {
            for (var j = 0; j < this.MaxHeight; j++) {
                var t = 111;
                var isBorder = true;
                if (j == 0 && i == this.MaxWidth - 1) {
                    t = 90;
                } else if (i == 0 && j == 0) {
                    t = 88;
                } else if (j == 0) {
                    t = 89;
                } else if (i == 0) {
                    t = 110;
                } else if (i == this.MaxWidth - 1) {
                    t = 112;
                } else isBorder = false;

                if (isBorder)
                    this.border
                        .create(i * this.tile_size + this.offsetX, j * this.tile_size + this.offsetY, "terrain", t)
                        .setScale(this.general_scale)
                        .setOrigin(0, 0)
                        .setDepth(0)
                        .refreshBody();
                else
                    this.bg
                        .create(i * this.tile_size + this.offsetX, j * this.tile_size + this.offsetY, "terrain", t)
                        .setScale(this.general_scale)
                        .setOrigin(0, 0)
                        .setDepth(0)
                        .refreshBody();
            }
        }
    }

    private drawDeaths() {
        var deathBlock = this.physics.add.staticGroup();

        var death = getDeath();
        var startLocation = window.innerWidth - death.length * 29 - 32;

        for (var i = 0; i < death.length; i++) {
            deathBlock
                .create(this.offsetX + 29 * i + startLocation, this.offsetY + 20, "number_0" + death[i], 90)
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
                .create(this.offsetX + 29 * i + 22, this.offsetY + 20, "number_0" + lvl[i], 90)
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
        const triggerZone = this.add.rectangle(this.offsetX + x * this.tile_size, this.offsetY + y * this.tile_size, w * this.tile_size, h * this.tile_size, 0xff0000, DEBUG ? 0.2 : 0).setOrigin(0, 0);
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
                    .create(this.offsetX + (x + i) * this.tile_size, this.offsetY + (y + j) * this.tile_size, "terrain", t)
                    .setScale(this.general_scale)
                    .setOrigin(0, 0)
                    .setDepth(0);

                obj.refreshBody();

                this.setBlock(x + i, y + j, obj);
            }
        }
    }

    getPositionY(y: number): number {
        if (y < 0) y = this.MaxHeight + y;
        return this.offsetX + y * this.tile_size;
    }

    getPositionX(x: number): number {
        if (x < 0) x = this.MaxWidth + x;
        return this.offsetX + x * this.tile_size;
    }
}
