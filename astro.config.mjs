import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	site: "https://me.oriz.in",
	integrations: [
		tailwind(),
		react(),
		AstroPWA({
			registerType: "autoUpdate",
			injectRegister: false,
			includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
			manifest: {
				id: "/",
				name: "Chirag Singhal — Personal OS",
				short_name: "Chirag",
				description:
					"Chirag Singhal — Software Engineer · Backend · AI Systems · Open Source",
				start_url: "/",
				scope: "/",
				display: "standalone",
				theme_color: "#f97316",
				background_color: "#0a0a0a",
				icons: [
					{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
					{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
					{
						src: "/icons/maskable-192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "/icons/maskable-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
				navigateFallback: null,
				runtimeCaching: [
					{
						// Live JSON data — network-only, never serve stale.
						urlPattern: ({ url }) => url.pathname.startsWith("/data/"),
						handler: "NetworkOnly",
					},
					{
						// Any cross-origin API / live data — network-only.
						urlPattern: ({ url }) => url.origin !== self.location.origin,
						handler: "NetworkOnly",
					},
				],
			},
		}),
	],
	output: "static",
	vite: {
		resolve: {
			alias: {
				"~": path.resolve(__dirname, "src"),
			},
		},
	},
});
