# Spec — Sistema de Design

## Objetivo

Dar ao FarmaConsulta uma identidade visual consistente e acessível, migrando a cor de marca de violeta para uma paleta azul-claro + branco, com fundação em tokens do Tailwind v4 e um conjunto pequeno de componentes-base reutilizáveis — antes de tocar em qualquer tela existente.

## Paleta e tipografia aprovadas

Aprovadas via prévia visual (ver `docs/DESIGN.md` para a tabela completa de tokens claro/escuro).

- **Cor de marca**: azul-céu `#3B9FE0` (hover/active `#1D74B8`, lavagem `#EAF6FE`), sobre neutros com leve viés azulado (`ink`/`muted`/`line`) e fundo branco (`canvas`)/quase-branco (`surface`).
- **Semânticas** (sucesso/erro/alerta) independentes da cor de marca.
- **Tipografia**: Manrope (títulos) + Inter (corpo/interface, já usada hoje) — auto-hospedadas em `frontend/public/fonts/`, sem chamada a CDN de terceiros.
- **Tema escuro**: tokens já definidos (via `prefers-color-scheme` e `[data-theme]`) mesmo sem nenhum toggle no app hoje — pronto para quando um for adicionado, sem retrabalho.

## Regras obrigatórias

1. **Zero mudança de comportamento e zero mudança de rota** em qualquer fase. Mudança visual é o objetivo desta spec, mas só nas telas explicitamente listadas em cada fase — nunca silenciosa em telas fora do escopo da fase.
2. **Mobile-first e acessível**: alvo de toque mínimo 44px, contraste AA, foco sempre visível.
3. **Um commit por fase**, com `npm test` verde no backend e `npm run build` do frontend sem erros ao final de cada uma.
4. Reportar qualquer comportamento estranho encontrado no caminho, sem corrigir por conta própria (exceto o já combinado explicitamente nesta spec — ver Fase 1).

## Fases

### Fase 1 — Fundação (concluída)

- Tokens de cor (`@theme` do Tailwind v4, `frontend/src/index.css`), com variante escura pronta via `--ds-*` + `[data-theme]`.
- Fontes Manrope/Inter auto-hospedadas (`frontend/public/fonts/`), removendo a dependência do Google Fonts CDN.
- Correção do bug pré-existente em `index.css`: a regra `button { background: none }` estava fora de qualquer `@layer`, o que a fazia vencer **qualquer** utility `bg-*` do Tailwind em qualquer `<button>` da aplicação inteira (não só nos componentes novos) — deixando botões com fundo sólido invisíveis. Corrigida movendo a regra para `@layer base`, para que as utilities (camada `utilities`, depois de `base`) voltem a vencer como esperado. Como o bug afetava literalmente todo botão com `bg-*` no app, esta correção **muda visualmente telas fora do escopo desta fase** — exceção deliberada e aprovada, já que a alternativa (deixar botões sólidos invisíveis) não é um comportamento a preservar.
- Componentes-base em `frontend/src/components/ui/`: `Button`, `Input`, `Select`, `Card`, `Badge`, `Modal`, `Toast`, `EmptyState` — ainda não adotados por nenhuma tela.
- Documentação em `docs/DESIGN.md`.

### Fase 2 — Landing page

Aplicar a paleta/tipografia na `LandingPage.jsx` e no `Layout`/`Navbar` (cabeçalho e rodapé usados em todo o app). Trocar `theme_color` do `index.html`/PWA manifest de violeta para o azul aprovado.

### Fase 3 — Autenticação

`LoginPage.jsx`, `SelecionarPerfilPage.jsx`, `InviteRegistro.jsx`, `PatientProfileForm.jsx`, `OnboardingSlider.jsx`.

### Fase 4 — Dashboard do paciente

`PatientDashboard.jsx` e os componentes em `components/patient/` (já modularizados pela spec de refatoração) — adotar `Button`/`Card`/`Badge`/`Modal`/`Toast`/`EmptyState` onde couber, mantendo toda a lógica intacta.

### Fase 5 — Dashboard do farmacêutico

`PharmacistDashboard.jsx` e `components/pharmacist/`.

### Fase 6 — Painel administrativo

`AdminPanel.jsx` e `components/admin/` — último por ser a área menos usada por pacientes/farmacêuticos.

## Critérios de aceite

- [x] Tokens de cor claro/escuro definidos em `frontend/src/index.css`
- [x] Manrope + Inter auto-hospedadas, sem dependência de CDN de fontes
- [x] Bug do `button { background: none }` corrigido
- [x] Componentes-base criados em `components/ui/`
- [x] `docs/DESIGN.md` documentando tokens e convenções
- [ ] Fases 2–6: paleta/tipografia aplicadas área por área, sem mudança de rota ou comportamento
- [ ] `npm test` verde e `npm run build` sem erros ao final de cada fase
- [ ] Um commit por fase
