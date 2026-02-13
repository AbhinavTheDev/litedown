import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";

export default defineConfig(({ mode }) => {
  const isLib = mode === "lib";

  return {
    plugins: [
      react(),
      isLib && dts({
        insertTypesEntry: true,
        include: ["src/lib"]
      }),
    ].filter(Boolean),
    build: isLib ? {
      lib: {
        entry: path.resolve(__dirname, "src/lib/index.ts"),
        name: "litedown",
        fileName: (format) => `index.${format}.js`,
      },
      rollupOptions: {
        external: ["react", "react-dom"],
        output: {
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
          },
        },
      },
    } : {
      outDir: "dist",
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});

