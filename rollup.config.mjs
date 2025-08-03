import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
import clear from "rollup-plugin-clear";
import htmlTemplate from "rollup-plugin-generate-html-template";

export default {
    input: "./src/index.ts",
    output: {
        file: "./dist/index.js",
        format: "esm",
    },
    treeshake: false,
    onwarn: (msg, warn) => {
      if (msg.code != 'CIRCULAR_DEPENDENCY'){
        warn(msg)
      }
    },
    plugins: [
        json(),
        nodeResolve({
            extensions: [".js", "jsx", ".ts", "tsx"]
        }),
        clear({
            targets: ["dist"],
        }),
        htmlTemplate({
            template: "./public/index.html",
            target: "./dist/index.html",
            attrs: ['type="module"']
        }),
        typescript(),
        commonjs(),
        nodeResolve()
    ]
}

