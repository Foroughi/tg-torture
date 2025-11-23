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
        var blocksInfo = [
            {
                x: 0,
                y: this.MaxHeight - 30,
                w: this.MaxWidth - 60,
                h: 1,
            },
        ];

        var scale = 2;
        var size = 16;
        var tile_size = scale * size;

        this.blocks = this.physics.add.staticGroup();
        this.blockMap = [];
        for (var b = 0; b < blocksInfo.length; b++) {
            var x = blocksInfo[b].x;
            var y = blocksInfo[b].y;
            var w = blocksInfo[b].w;
            var h = blocksInfo[b].h;

            for (var i = 0; i < w; i++) {
                this.blockMap[i] = [];
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

                    var obj = this.blocks
                        .create((x + i) * tile_size, (y + j) * tile_size, "terrain", t)
                        .setScale(scale)
                        .setOrigin(0, 0)
                        .setDepth(0);

                    obj.refreshBody();

                    this.blockMap[i][j] = obj;
                }
            }
        }

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

        for (var i = 0; i < text.length; i++) {
            this.blocks
                .create(text[i][0] * tile_size, text[i][1] * tile_size, "terrain", text[i][2])
                .setScale(1)
                .setOrigin(0, 0)
                .setDepth(0);
        }

        obj.refreshBody();
    }
}
