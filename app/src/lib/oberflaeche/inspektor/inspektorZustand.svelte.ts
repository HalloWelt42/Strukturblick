// Zustand des Inspektors je Blatt: die zuletzt gewählte Schreibweise zum Kopieren des Pfads.

import type { Schreibweise } from "../../kern";

export class InspektorZustand {
  schreibweise = $state<Schreibweise>("jq");
}
