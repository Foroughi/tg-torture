import { BaseGameScene } from "../scene";

export class Finish_Scene extends BaseGameScene {
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

    override createBlocks() {
        this.drawStaticBlock(0, this.MaxHeight - 1, this.MaxWidth, 1);
        var text = [
            [12, 12, 29],
            [13, 12, 29],
            [14, 12, 29],
            [13, 13, 29],
            [13, 14, 29],
            [13, 15, 29],
            [13, 16, 29],

            [15, 14, 29],
            [16, 14, 29],
            [17, 14, 29],
            [17, 15, 29],
            [17, 16, 29],
            [16, 16, 29],
            [15, 16, 29],
            [15, 15, 29],

            [20, 12, 29],
            [20, 13, 29],
            [20, 14, 29],
            [20, 15, 29],
            [20, 16, 29],
            [21, 14, 29],
            [22, 14, 29],
            [22, 15, 29],
            [22, 16, 29],
            [21, 16, 29],

            [24, 12, 29],
            [25, 12, 29],
            [26, 12, 29],
            [26, 13, 29],
            [25, 14, 29],
            [26, 14, 29],
            [24, 13, 29],
            [24, 14, 29],
            [24, 15, 29],
            [24, 16, 29],
            [25, 16, 29],
            [26, 16, 29],
        ];

        var blocks = this.physics.add.staticGroup();
        for (var i = 0; i < text.length; i++) {
            var obj = blocks
                .create(text[i][0] * this.tile_size, text[i][1] * this.tile_size, "terrain", text[i][2])
                .setScale(this.general_scale)
                .setOrigin(0, 0)
                .setDepth(0);

            obj.refreshBody();
        }
    }
}
