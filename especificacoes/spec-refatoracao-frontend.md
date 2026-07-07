# Spec — Refatoração Estrutural do Frontend

## Objetivo

Refatorar os quatro componentes gigantes do frontend — `AdminPanel.jsx` (~3.200 linhas), `ConsultaModal.jsx`, `PatientDashboard.jsx` e `PharmacistDashboard.jsx` (~1.400–1.600 linhas cada) — em estruturas modulares menores e mais fáceis de manter.

## Regras obrigatórias

1. **Zero mudança de comportamento e zero mudança visual** — esta etapa é só estrutura. O redesign vem depois, em outra spec.
2. **Estratégia**: extrair cada aba/seção para um componente próprio em subpastas (`components/admin/`, `components/patient/`, `components/pharmacist/`, `components/consulta/`), extrair hooks de dados repetidos (fetch autenticado, polling, paginação, toasts) para `hooks/`, e utilitários compartilhados (formatação de data/moeda, badges de status) para `utils/`.
3. **Meta**: nenhum arquivo acima de ~400 linhas ao final.
4. **Um componente-alvo por fase** (comece pelo `AdminPanel`), com commit ao final de cada fase.
5. **Ao final de cada fase**: `npm test` verde no backend e `npm run build` do frontend sem erros. Reportar qualquer comportamento estranho encontrado no caminho, sem corrigir por conta própria.

## Fases

1. `AdminPanel.jsx` (~3.200 linhas)
2. `ConsultaModal.jsx`
3. `PatientDashboard.jsx`
4. `PharmacistDashboard.jsx`

## Critérios de aceite

- [ ] Os 4 componentes refatorados, nenhum arquivo de componente acima de ~400 linhas
- [ ] Hooks de dados repetidos (fetch autenticado, polling, paginação, toasts) extraídos para `hooks/`
- [ ] Utilitários compartilhados (formatação de data/moeda, badges de status) extraídos para `utils/`
- [ ] Zero mudança de comportamento ou visual — validado manualmente em cada fase
- [ ] `npm test` verde e `npm run build` sem erros ao final de cada fase
- [ ] Um commit por fase
- [ ] Comportamentos estranhos encontrados reportados, não corrigidos nesta spec
