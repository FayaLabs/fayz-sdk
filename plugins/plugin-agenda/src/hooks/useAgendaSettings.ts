import { usePluginPrefs } from '@fayz/saas'

const DEFAULTS = {
  startTime: '07:00',
  endTime: '21:00',
}

export function useAgendaSettings() {
  const prefs = usePluginPrefs('agenda', DEFAULTS)

  return {
    startTime: prefs.get('startTime'),
    endTime: prefs.get('endTime'),
    setStartTime: (v: string) => prefs.set('startTime', v),
    setEndTime: (v: string) => prefs.set('endTime', v),
  }
}
