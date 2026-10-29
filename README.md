# Forja — Dieta, Treino e Evolução

App pessoal de academia, **mobile-first para iPhone**, focado em **ganho de massa magra**. Funciona **offline**, sem login e sem enviar dados a ninguém: tudo fica no aparelho.

- **Hoje**: linha do tempo do dia (acordar → pré-treino → treino → pós → refeições → dormir) com checks, anéis de progresso e o bloco "Amanhã".
- **Dieta**: semana Seg–Dom, refeições com horários e macros, check por refeição, água, metas (TMB Mifflin-St Jeor + superávit), ajuste automático das porções, substituições equivalentes, vitaminas calóricas e lista de compras.
- **Treino**: ciclo ABC para iniciante, só com os equipamentos que você marcou, demonstração animada, modo ao vivo de uma mão, dupla progressão de carga, recordes 🏆, volume semanal por músculo e deload.
- **Evolução**: peso com média móvel e faixa-alvo (0,25–0,5 kg/semana), medidas, cargas (1RM estimado), fotos antes × depois, check-in semanal com sugestões, metas e calendário de consistência.

> O app é apoio organizacional e **não substitui nutricionista, médico ou educador físico**.

---

## 1. Rodar no computador

Requisitos: Node.js 20+.

```bash
npm install
```

```bash
npm run dev
```

Abra o endereço mostrado (ex.: `http://localhost:5173`). O `--host` já vem ligado, então dá para abrir no iPhone pela mesma rede Wi-Fi usando o IP do computador (sem offline/instalação, que exigem HTTPS).

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm test` | Testes da lógica crítica (planejador de horários, TMB/macros, progressão, check-in, backup) |
| `npm run build` | Gera a versão de produção em `dist/` (com service worker para offline) |
| `npm run preview` | Serve o `dist/` localmente para conferir |
| `node scripts/fetch-exercise-images.mjs` | Baixa as imagens dos exercícios novos que você adicionar ao seed |
| `node scripts/make-icons.mjs` | Regera os ícones PNG a partir de `public/icons/icon.svg` |

## 2. Publicar (gratuito, com HTTPS)

O iPhone só instala e usa offline um app servido por **HTTPS**. Duas opções gratuitas:

**Opção A — GitHub Pages (automático a cada push)**
1. Crie um repositório no GitHub e envie este projeto (`git push`).
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` já incluso compila e publica. O endereço fica `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

**Opção B — Vercel**
1. Entre em vercel.com com sua conta do GitHub → **Add New → Project** → importe o repositório.
2. Framework: **Vite** (detectado). Build: `npm run build`, saída: `dist`. Clique em **Deploy**.

## 3. Instalar no iPhone

1. Abra o endereço do app no **Safari** (precisa ser o Safari).
2. Toque no botão **Compartilhar** (quadrado com seta para cima ⬆️, na barra inferior).
3. Role a lista e toque em **Adicionar à Tela de Início**.
4. Confirme o nome **Forja** e toque em **Adicionar**.
5. Abra pelo ícone novo na Tela de Início: o app abre em tela cheia, sem barra do Safari.
6. Abra uma vez com internet e navegue pelas abas — depois disso ele **funciona offline** (inclusive as animações dos exercícios).

Dica: segure o ícone para ver o atalho **"Iniciar treino de hoje"** (quando o iOS oferecer atalhos para apps da Tela de Início).

## 4. Atualizar o app

Quando uma versão nova for publicada, abra o app com internet: aparece no topo **"Nova versão disponível → Atualizar"**. Seus dados não são apagados na atualização.

## 5. Backup (importante)

Os dados ficam no armazenamento do Safari **só neste iPhone**. O iOS pode apagar dados de apps web que ficam semanas sem uso, e eles não vão para o iCloud automaticamente.

- **Ajustes (engrenagem na tela Hoje) → Backup → Exportar backup completo (JSON)** → **Salvar em Arquivos** (iCloud Drive). Inclui fotos de progresso.
- Faça **1× por mês** — o app mostra um lembrete discreto na tela Hoje após 30 dias sem backup.
- Para restaurar (ou passar para outro iPhone): **Ajustes → Importar backup** e escolha o arquivo `.json`.
- **Exportar planilhas (CSV)** gera medidas e séries para abrir no Numbers/Excel.

## 6. Personalizar os dados iniciais

Os dados seed ficam em arquivos simples em `src/seed/`:

| Arquivo | Conteúdo |
|---|---|
| `exercises.ts` | Biblioteca de exercícios (nome PT-BR, músculos, passo a passo, erros comuns, segurança, alternativas, equipamentos) e lista de equipamentos |
| `workouts.ts` | Treinos A, B e C (séries, faixa de reps, descanso, aquecimento, volta à calma) |
| `foods.ts` | Alimentos e macros por porção |
| `menu.ts` | Cardápio-exemplo (3 variações por refeição), vitaminas e dicas para comer mais |

O seed só é aplicado na primeira abertura; depois, edite pelo próprio app (ou use **Ajustes → Apagar todos os dados** para recomeçar).

## 7. Estrutura do código

```
src/
  domain/        lógica pura e testada (planejador, nutrição, progressão, tempo do treino, check-in)
  db/            modelo de dados (types.ts), banco local Dexie (db.ts), repositórios (repo.ts) e hooks reativos
  seed/          dados iniciais editáveis
  components/    UI Liquid Glass (cards, anéis, sheets, gráficos, ícones, animação de exercício)
  screens/       telas: Hoje, Dieta, Treino (inclui modo ao vivo), Evolução, Ajustes, Onboarding
```

As telas só acessam os dados por `db/repo.ts` e `db/hooks.ts`, o que facilita trocar o armazenamento por sincronização (ex.: Supabase) ou portar para SwiftUI no futuro. Veja `DECISIONS.md` e `ROADMAP.md`.

## Créditos

Imagens dos exercícios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense / domínio público).
