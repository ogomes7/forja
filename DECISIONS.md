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
| 7 | 2026-10-29 | Cor de destaque **verde-água** (`#0f766e` claro — contraste ≥ 4,5:1 com texto branco / `#2dd4bf` escuro); macros: kcal âmbar, proteína azul, carbo verde-água, gordura magenta. | Paleta sóbria com um destaque. |
| 8 | 2026-10-29 | Imagens do **free-exercise-db** (Unlicense) baixadas para `public/exercises/` (88 JPGs, ~5,7 MB) e incluídas no cache offline. Animação = troca dos 2 quadros em CSS; fallback SVG. | Funciona sem internet na academia; o repositório não traz licença separada para as imagens, então vale a do projeto (domínio público). |
| 9 | 2026-10-29 | Treinos calibrados por estimativa: 60 s de preparo + 45 s por série (×2 se unilateral) + descanso + 60 s de troca, mais 5 + 5 min de aquecimento/alongamento. A ≈ 44, B ≈ 44, C ≈ 46 min. | Garante caber na janela 07:10–08:00 (critério d). |
| 10 | 2026-10-29 | Refeições: pré-treino 75 min antes de sair; pós 20 min após o limite da academia; almoço, lanche e jantar distribuídos igualmente até a ceia (45 min antes de dormir), arredondados a 15 min. Com 5 refeições, o jantar fica 2 h antes de dormir. | Regra simples, previsível e testada. |
| 11 | 2026-10-29 | Metas: Mifflin-St Jeor × fator de atividade + superávit de 400 kcal; proteína 2,0 g/kg, gordura 0,9 g/kg, carboidrato = resto. | Faixa do briefing (+300 a +500; 1,6–2,2 g/kg; 0,8–1 g/kg). |
| 12 | 2026-10-29 | "Ajustar porções à meta" escala em 3 etapas: proteínas/laticínios → proteína; gorduras → gordura; carboidratos/frutas → calorias. Ovos e carnes em unidades inteiras. | Bater kcal sem estourar gordura nem proteína. |
| 13 | 2026-10-29 | Progressão: **dupla progressão** (todas as séries no topo da faixa → +incremento do exercício; abaixo do mínimo → −incremento). Recordes: carga, 1RM (Epley) e volume da série. Deload sugerido a cada 7 semanas (60% das séries, 90% da carga). | Simples para iniciante e é a métrica central do app. |
| 14 | 2026-10-29 | Check-in: tendência por regressão linear das pesagens dos últimos 21 dias (exige ≥ 10 dias de intervalo). Parado → +200 kcal; < 0,25 → +100; > 0,7 → −150; cintura subindo > 1,5× braços/peito → revisar superávit. | Sugestões do briefing, com dados suficientes para não reagir a ruído. |
| 15 | 2026-10-29 | Sequência (streak) conta treinos programados cumpridos; **dia de descanso não quebra**. | Inspirado no Gentler Streak: recuperação faz parte do ganho de massa. |
| 16 | 2026-10-29 | Exportação usa a **folha de compartilhamento** do iOS (`navigator.share` com arquivo) → "Salvar em Arquivos"; fallback para download. | `<a download>` é pouco confiável em PWA no iPhone. |
| 17 | 2026-10-29 | Service worker em modo **prompt** + `clientsClaim`: atualização só quando o usuário toca "Atualizar". | Nunca trocar a versão no meio de um treino. |
| 18 | 2026-10-29 | Gráficos com uma série por vez (seletor de medida/exercício/métrica), um único eixo, tooltip ao toque. Cores lidas dos tokens CSS. | Legibilidade no celular; sem paleta categórica. |
