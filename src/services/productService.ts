import { supabase, type Product, type ProductStage, type StageName } from '../supabase'

const STAGE_ORDER: StageName[] = ['ecommerce', 'design', 'sampling', 'costing', 'planning', 'production']

export const productService = {
  async fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*, stages:product_stages(*)')
      .order('created_at', { ascending: false })
    return { data: data as Product[] | null, error }
  },

  async addProduct(productData: {
    name: string
    style_code?: string
    category: string
    season?: string
    description?: string
    created_by: string
    created_by_email: string
    created_by_name: string
    team_name: string
  }) {
    return await supabase.from('products').insert([productData]).select().single()
  },

  async completeStage(
    productId: string,
    stageId: string,
    currentStageName: StageName,
    notes: string,
    assigneeEmail: string,
    assigneeName: string
  ) {
    const now = new Date().toISOString()
    const nextStageIndex = STAGE_ORDER.indexOf(currentStageName) + 1
    const isLastStage = nextStageIndex >= STAGE_ORDER.length
    const nextStage = isLastStage ? null : STAGE_ORDER[nextStageIndex]

    // Complete current stage
    const { error: stageError } = await supabase
      .from('product_stages')
      .update({ status: 'completed', completed_at: now, notes, assigned_to_email: assigneeEmail, assigned_to_name: assigneeName })
      .eq('id', stageId)

    if (stageError) return { error: stageError }

    if (nextStage) {
      // Activate next stage
      const { error: nextError } = await supabase
        .from('product_stages')
        .update({ status: 'active', started_at: now })
        .eq('product_id', productId)
        .eq('stage_name', nextStage)

      if (nextError) return { error: nextError }

      // Update product's current_stage
      const { error: productError } = await supabase
        .from('products')
        .update({ current_stage: nextStage, updated_at: now })
        .eq('id', productId)

      return { error: productError }
    } else {
      // All stages done — mark product completed
      const { error: productError } = await supabase
        .from('products')
        .update({ current_stage: 'completed', status: 'completed', updated_at: now })
        .eq('id', productId)

      return { error: productError }
    }
  },

  async updateStageAssignee(stageId: string, email: string, name: string) {
    return await supabase
      .from('product_stages')
      .update({ assigned_to_email: email, assigned_to_name: name })
      .eq('id', stageId)
  },

  async updateProductStatus(productId: string, status: Product['status']) {
    return await supabase
      .from('products')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', productId)
  },

  async deleteProduct(productId: string) {
    return await supabase.from('products').delete().eq('id', productId)
  },

  subscribeToProducts(callback: (payload: any) => void) {
    return supabase
      .channel('pipeline_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_stages' }, callback)
      .subscribe()
  }
}

export function getStageDaysElapsed(stage: ProductStage): number | null {
  if (!stage.started_at) return null
  const start = new Date(stage.started_at).getTime()
  const end = stage.completed_at ? new Date(stage.completed_at).getTime() : Date.now()
  return Math.floor((end - start) / (1000 * 60 * 60 * 24))
}

export function getStageSLAStatus(stage: ProductStage): 'ok' | 'warning' | 'overdue' {
  if (stage.status !== 'active') return 'ok'
  const elapsed = getStageDaysElapsed(stage)
  if (elapsed === null) return 'ok'
  if (elapsed > stage.sla_days) return 'overdue'
  if (elapsed >= stage.sla_days * 0.7) return 'warning'
  return 'ok'
}

export const STAGE_META: Record<StageName, { label: string; color: string; bg: string }> = {
  ecommerce:  { label: 'Ecommerce',  color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  design:     { label: 'Design',     color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  sampling:   { label: 'Sampling',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  costing:    { label: 'Costing',    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  planning:   { label: 'Planning',   color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  production: { label: 'Production', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)'  },
}

export const STAGE_ORDER_LIST = STAGE_ORDER
