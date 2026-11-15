import axios from "axios"
import { API_BASE } from "@/lib/api/api-base"

export interface TwoFactorSetup {
  secret: string
  qrCodeDataUrl: string
  recoveryCodes: string[]
}

const base = () => (API_BASE) + "/api/v1/users"

export async function setupTwoFactor(userId: string): Promise<TwoFactorSetup> {
  const res = await axios.post(`${base()}/${userId}/2fa/setup`, {}, { withCredentials: true })
  return res.data.data
}

export async function enableTwoFactor(userId: string, code: string): Promise<void> {
  await axios.post(`${base()}/${userId}/2fa/enable`, { code }, { withCredentials: true })
}

export async function disableTwoFactor(userId: string, password: string, code: string): Promise<void> {
  await axios.post(`${base()}/${userId}/2fa/disable`, { password, code }, { withCredentials: true })
}

export async function regenerateRecoveryCodes(userId: string, password: string, code: string): Promise<string[]> {
  const res = await axios.post(`${base()}/${userId}/2fa/recovery-codes/regenerate`, { password, code }, { withCredentials: true })
  return res.data.data.recoveryCodes
}
