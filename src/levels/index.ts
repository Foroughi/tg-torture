import { Level_1 } from "./1";
import { Finish_Scene } from "./finish";
import { Test_Scene } from "./test";

export const levels: Record<string, any> = {
    "1": Level_1,

    finish: Finish_Scene,
    test: Test_Scene,
};
