// Einstieg: Schriften und Symbole aus npm (kein CDN), Stil aus den Entwürfen, dann die Schale.
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./stil/marken.css";
import "./stil/bausteine.css";
import "./stil/schale.css";
import { mount } from "svelte";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
