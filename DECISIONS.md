# Decisões

Registro curto das decisões tomadas durante o desenvolvimento (mais recentes no fim).

| # | Data | Decisão | Motivo |
|---|------|---------|--------|
| 1 | 2026-10-29 | **PWA** (React 18 + TS + Vite 6 + Tailwind 4 + Zustand + Dexie + Recharts), não app nativo. | Instala no iPhone sem conta de desenvolvedor Apple; decisão confirmada pelo usuário. |
| 2 | 2026-10-29 | Nome provisório do app: **Forja**. | Curto, cabe sob o ícone da Tela de Início. Trocável em `vite.config.ts` e `index.html`. |
| 3 | 2026-10-29 | **HashRouter** (`#/rota`) e `base: './'`. | Funciona em qualquer hospedagem estática e offline sem configurar rewrites. |
| 4 | 2026-10-29 | **Sem notificações, push, lembretes, vibração, wake lock ou cronômetro de descanso.** | Pedido do usuário: ele acompanha o tempo pelo relógio. O app só **informa** o descanso (ex.: "Descanso 90 s"). O briefing citava "notificações com fallback" no marco 6, mas a seção 8 e o usuário pediram para não ter — prevalece a seção 8. |
| 5 | 2026-10-29 | Lembrete de backup = **aviso dentro do app** (faixa discreta após 30 dias sem exportar). | Não há notificações; o Safari pode apagar dados de PWAs pouco usados. |
| 6 | 2026-10-29 | Liquid Glass em CSS (`backdrop-filter: blur() saturate()`), com **fallback sólido** (Ajustes → "Reduzir transparência") e automático quando não há suporte. | Legibilidade acima do efeito. |
| 7 | 2026-10-29 | Cor de destaque **verde-água** (`#0d9488` claro / `#2dd4bf` escuro); macros: kcal âmbar, proteína azul, carbo verde-água, gordura magenta. | Paleta sóbria com um destaque. |
