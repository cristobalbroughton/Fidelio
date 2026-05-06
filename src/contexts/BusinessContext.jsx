import { createContext, useContext, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { getEffectivePlan, getPlanLimits } from '../lib/planLimits'

const BusinessContext = createContext(null)

const BIZ_SELECT = [
  'id', 'name', 'category', 'slug', 'logo_url', 'program_name',
  'points_per_clp', 'welcome_points', 'primary_color', 'plan',
  'pro_expires_at', 'failed_registrations', 'loyalty_customers(count)',
].join(', ')

export function BusinessProvider({ children }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select(BIZ_SELECT)
        .eq('owner_id', user.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  const planStatus = useMemo(() => {
    if (!business) return null
    const count = business.loyalty_customers?.[0]?.count ?? 0
    const effective = getEffectivePlan(business)
    const { maxCustomers } = getPlanLimits(effective.plan)
    return { effective, customerCount: count, maxCustomers }
  }, [business])

  const updateBusiness = (partial) => {
    queryClient.setQueryData(['business', user?.id], prev =>
      prev ? { ...prev, ...partial } : prev
    )
  }

  return (
    <BusinessContext.Provider value={{ business, loadingBusiness, planStatus, updateBusiness }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusinessContext() {
  return useContext(BusinessContext)
}
