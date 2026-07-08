# Sistema de Design — FarmaConsulta

Fundação visual definida na Fase 1 de `especificacoes/spec-design-system.md`.
Este documento é a referência de uso; a justificativa de cada escolha está na
spec. Nada neste documento está aplicado a nenhuma tela existente ainda — a
aplicação por área acontece nas fases seguintes da spec.

## Cor

Paleta azul-claro + branco. Os neutros (`ink`, `muted`, `line`) têm leve viés
azulado — não são cinza puro — para que a identidade apareça até no texto e
nas bordas.

| Token (Tailwind)                        | Uso                                   | Claro     | Escuro    |
|------------------------------------------|----------------------------------------|-----------|-----------|
| `bg-brand` / `text-brand`                 | Cor de marca, ações primárias          | `#3B9FE0` | `#5CB6EC` |
| `bg-brand-deep` / `text-brand-deep`       | Hover/active, links                    | `#1D74B8` | `#8ED2F6` |
| `bg-brand-wash`                           | Fundos sutis (hover, foco, badges)     | `#EAF6FE` | `#14293A` |
| `text-ink`                                | Texto principal                        | `#1C2B3A` | `#E9F2FA` |
| `text-muted`                              | Texto secundário, legendas             | `#5B6B7C` | `#96AEC2` |
| `border-line`                             | Bordas e divisores                     | `#D8E6F2` | `#24384A` |
| `bg-canvas`                               | Fundo de página                        | `#FFFFFF` | `#0D1A25` |
| `bg-surface`                              | Fundo de cartões/áreas destacadas       | `#F7FBFE` | `#142433` |
| `bg-success` / `bg-success-wash`          | Estado de sucesso                      | `#1E9E6C` / `#E4F7EF` | `#38C793` / `#103326` |
| `bg-error` / `bg-error-wash`              | Estado de erro                         | `#D6455A` / `#FCEAED` | `#EA7E8E` / `#3A1A20` |
| `bg-alert` / `bg-alert-wash`              | Estado de alerta/atenção               | `#B9791E` / `#FBF1DF` | `#E3AA55` / `#3A2C14` |

As cores semânticas (sucesso/erro/alerta) são independentes da cor de marca —
nunca use `brand` para comunicar status.

Os tokens já têm variante escura pronta (via `prefers-color-scheme` e via
`:root[data-theme="dark"]`/`[data-theme="light"]` para uma futura troca
manual), mas o app não tem nenhum toggle de tema hoje — isso é só fundação.

## Tipografia

- **Manrope** (`font-heading`) para títulos — geométrica, um pouco mais
  quente que a Inter, dá personalidade sem virar decorativa.
- **Inter** (`font-body`) para corpo e interface — mesma fonte que o app já
  usa hoje, ótima legibilidade em telas densas.
- Ambas auto-hospedadas em `frontend/public/fonts/` (sem chamada a CDN de
  terceiros — relevante para LGPD, já que o app trata dados de saúde).

| Papel      | Classe sugerida                          | Peso |
|------------|-------------------------------------------|------|
| Display    | `font-heading font-extrabold text-4xl`     | 800  |
| H1         | `font-heading font-extrabold text-[27px]`  | 800  |
| H2         | `font-heading font-bold text-xl`           | 700  |
| H3         | `font-heading font-bold text-base`         | 700  |
| Corpo      | `font-body text-[15px]`                    | 400  |
| Pequeno    | `font-body text-sm text-muted`             | 400  |
| Rótulo     | `font-body font-semibold text-xs uppercase tracking-wide text-brand-deep` | 600 |

## Espaçamento, raio e sombra

Sem tokens novos — usa a escala já existente do Tailwind, só com convenção de
uso documentada:

- **Espaçamento**: escala padrão do Tailwind (`p-1`…`p-12`, `gap-*`).
- **Raio**: `rounded-xl` (botões, inputs, badges pequenos), `rounded-2xl`
  (cards, modais), `rounded-full` (badges/pills, avatares).
- **Sombra**: `shadow-sm` (cards em repouso), `shadow-md` (modais, popovers).

## Acessibilidade

- Alvo de toque mínimo de 44px (`h-11`) em botões e campos de formulário.
- Contraste AA verificado nos pares texto/fundo da tabela acima.
- Foco sempre visível: `focus-visible:ring-2 focus-visible:ring-brand`.
- Modais fecham com `Esc` e têm `role="dialog"` + `aria-modal`.

## Componentes base

Em `frontend/src/components/ui/` (importáveis via `components/ui`):

| Componente   | Arquivo            | Notas                                                    |
|--------------|---------------------|-----------------------------------------------------------|
| `Button`     | `Button.jsx`         | Variantes `primary/secondary/ghost/danger`, tamanhos `md/sm` |
| `Input`      | `Input.jsx`          | Label + mensagem de erro opcionais                       |
| `Select`     | `Select.jsx`         | Mesmo padrão visual do `Input`                            |
| `Card`       | `Card.jsx`           | Container com `as` para trocar a tag (`div`, `section`…)  |
| `Badge`      | `Badge.jsx`          | Variantes `success/error/alert/info/neutral`              |
| `Modal`      | `Modal.jsx`          | Casca de modal com título opcional e fechamento por `Esc` |
| `Toast`      | `Toast.jsx`          | Só visual — cada área mantém seu próprio hook de exibição até migrar |
| `EmptyState` | `EmptyState.jsx`     | Ícone/emoji + título + descrição + ação opcional          |

Nenhum destes componentes está em uso em nenhuma tela ainda. A adoção
acontece área por área nas próximas fases da spec, sem trocar rotas nem
comportamento — só a apresentação.
