/** Calendário comercial da THITA Store, independente do fuso do navegador. */
export function dataLoja(instante: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instante)
  const valor = (tipo: string) => partes.find(parte => parte.type === tipo)?.value ?? ''
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

export function diaSemanaLoja(instante: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', weekday: 'short' })
    .format(instante).replace('.', '')
}
