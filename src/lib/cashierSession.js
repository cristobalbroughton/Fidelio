const KEY = 'loyia_cashier'

export const getCashierSession = () => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export const setCashierSession = (data) =>
  localStorage.setItem(KEY, JSON.stringify(data))

export const clearCashierSession = () =>
  localStorage.removeItem(KEY)

export const isCashierSession = () =>
  getCashierSession()?.type === 'cashier'
