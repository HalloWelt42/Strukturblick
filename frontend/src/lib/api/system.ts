// System-Endpunkte: Health und Capabilities.

import { requestJson } from './http'
import type { CapabilitiesAntwort, HealthAntwort } from './typen'

export function getHealth(): Promise<HealthAntwort> {
  return requestJson<HealthAntwort>('/api/health')
}

export function getCapabilities(): Promise<CapabilitiesAntwort> {
  return requestJson<CapabilitiesAntwort>('/api/capabilities')
}
