export const PLAN_LIMITS = {
  free:    { maxCustomers: 50,       maxRewards: 2,        label: 'Free'    },
  starter: { maxCustomers: 300,      maxRewards: Infinity, label: 'Starter' },
  pro:     { maxCustomers: Infinity, maxRewards: Infinity, label: 'Pro'     },
}

const GRACE_DAYS = 5

export const WA_UPGRADE_LINK =
  `https://wa.me/56912345678?text=${encodeURIComponent('Hola, quiero mejorar mi plan de Loyia')}`

// Devuelve { plan, isGrace, daysLeft? }
export function getEffectivePlan(business) {
  const plan = business?.plan ?? 'free'
  if (plan === 'free') return { plan: 'free', isGrace: false }

  const expiresAt = business?.pro_expires_at
  if (expiresAt) {
    const expiresDate = new Date(expiresAt)
    if (!isNaN(expiresDate.getTime())) {
      const diffDays = (Date.now() - expiresDate) / 86_400_000
      if (diffDays > 0) {
        if (diffDays <= GRACE_DAYS)
          return { plan, isGrace: true, daysLeft: Math.ceil(GRACE_DAYS - diffDays) }
        return { plan: 'free', isGrace: false }
      }
    }
  }
  return { plan, isGrace: false }
}

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function getUpgradeMessage(currentPlan) {
  if (currentPlan === 'free')    return 'Mejora a Starter'
  if (currentPlan === 'starter') return 'Mejora a Pro'
  return null
}
