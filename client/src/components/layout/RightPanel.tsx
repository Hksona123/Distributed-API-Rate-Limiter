import { LiveLog }    from '../log/LiveLog'
import { Playground } from '../playground/Playground'

export function RightPanel() {
  return (
    <aside
      className="hidden xl:flex flex-col gap-4 flex-shrink-0 overflow-y-auto"
      style={{ width: '280px' }}
    >
      <LiveLog />
      <Playground />
    </aside>
  )
}
