import { useOutletContext } from 'react-router-dom'
import { PipelineView } from '../components/pipeline/PipelineView'
import type { AppContext } from '../components/layout/AppLayout'

export function PipelinePage() {
  const { session } = useOutletContext<AppContext>()
  return <PipelineView session={session} />
}
