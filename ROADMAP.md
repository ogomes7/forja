# Roadmap

## v1 (entregue)

- [x] Onboarding de 1 minuto (objetivo, dados, experiência, dias de treino, horários)
- [x] Planejador reverso de horários (dormir, acordar, hidratação, pré-treino, lanche rápido, treino, pós, refeições) com recálculo e confirmação
- [x] Tela Hoje: linha do tempo com checks, anéis (refeições, kcal, proteína, água), bloco "Amanhã", lembrete de backup, sugestão de deload
- [x] Dieta: semana Seg–Dom, check por refeição, edição de refeições/alimentos/horários, copiar dia, substituições equivalentes, água, metas (TMB + superávit + macros, manual opcional), ajuste automático de porções, vitaminas e dicas, lista de compras
- [x] Treino: ABC iniciante, equipamentos disponíveis com troca automática, biblioteca com demonstração animada (free-exercise-db), edição de treino com tempo estimado vs. janela, modo ao vivo de uma mão, cargas pré-preenchidas, dupla progressão, recordes, histórico, volume semanal por músculo, deload
- [x] Evolução: peso (média móvel 7 dias + faixa-alvo), medidas, cargas (carga máx., 1RM, volume), fotos antes × depois, check-in semanal com sugestão de ajuste de kcal, metas, consistência (sequência, aderência, calendário)
- [x] PWA instalável e offline, aviso de nova versão, backup/restauração JSON, exportação CSV
- [x] Tema claro/escuro automático, opção sem transparência, `prefers-reduced-motion`, alvos ≥ 44 px, rótulos de acessibilidade

## Fora da v1 (decisão do usuário)

- Notificações, push, lembretes, despertador/Calendário, vibração e cronômetro de descanso — o app só **informa** horários e descanso.

## Próximos passos possíveis

- [ ] Gráfico de volume semanal por grupo muscular ao longo das semanas
- [ ] Editor de alimentos personalizados (cadastrar alimento novo com macros) e busca por código de barras
- [ ] Planilha de periodização (aumentar séries gradualmente ao longo do bloco)
- [ ] Modo "treino rápido" (versão de 30 min de cada treino para dias apertados)
- [ ] Sincronização opcional entre aparelhos (Supabase) mantendo o modo local
- [ ] Versão nativa SwiftUI (Liquid Glass real do iOS 26, widgets, Atalhos/Siri, HealthKit para peso)
- [ ] Code-splitting por aba para reduzir o primeiro carregamento
