# Spec: Onde Comprar (Farmácias Parceiras)

## Objetivo

Após a consulta, oferecer ao paciente uma seção opcional "Onde
comprar" com farmácias parceiras (links de afiliado), gerando
receita de afiliação para a plataforma — SEM alterar, poluir ou
vincular comercialmente o documento clínico (receita/orientação).

## Princípios inegociáveis (compliance)

1. A receita (PDF) permanece 100% limpa: nenhum link, logo de
   parceiro, QR code comercial ou menção a farmácias. Documento
   clínico e conveniência comercial são coisas separadas.
2. O farmacêutico que atendeu NÃO recebe parte da comissão de
   afiliado. A comissão é exclusivamente da plataforma. Nada no
   painel do farmacêutico exibe dados de afiliação.
3. Transparência obrigatória: a seção exibe sempre o aviso
   "Parceria comercial: ao comprar pelos links abaixo, o
   FarmaConsulta pode receber comissão, sem custo adicional para
   você. A escolha da farmácia é livre e não afeta seu atendimento."
4. Nenhum dado do paciente é enviado ao parceiro: links são
   genéricos (home do parceiro ou busca do produto), sem nome,
   e-mail, CPF ou id do paciente em query string. Apenas o código
   de afiliado da PLATAFORMA.
5. Escopo de produtos: links diretos de produto apenas para MIPs
   (medicamentos isentos de prescrição). Para medicamentos de
   prescrição, o link é somente para a home/busca da farmácia,
   nunca "compre este medicamento".
6. A seção é opcional e não intrusiva: nunca bloquear, atrasar ou
   condicionar o download da receita à passagem pela seção.

> Pendência externa: validar o modelo com advogada/CRF-SP antes de
> ativar em produção. A feature deve nascer atrás de uma flag de
> configuração (ver abaixo) para poder ser desligada instantaneamente.

## Modelo de dados (Prisma)

### PartnerPharmacy

| Campo        | Tipo     | Regras                                    |
|--------------|----------|-------------------------------------------|
| id           | String   | cuid, PK                                  |
| nome         | String   | obrigatório (ex.: "Droga Raia")           |
| logoUrl      | String?  | opcional                                  |
| baseUrl      | String   | URL base do parceiro                      |
| affiliateCode| String   | código/parâmetro de afiliado da plataforma|
| linkTemplate | String?  | template p/ busca de produto (MIPs), ex.: "https://parceiro.com/busca?q={produto}&aff={code}" |
| ativo        | Boolean  | default true                              |
| ordem        | Int      | ordenação de exibição                     |
| createdAt/updatedAt | DateTime | timestamps                         |

### AffiliateClick (métrica mínima)

| Campo      | Tipo     | Regras                                       |
|------------|----------|-----------------------------------------------|
| id         | String   | cuid, PK                                      |
| pharmacyId | String   | FK PartnerPharmacy                            |
| consultaId | String?  | FK consulta (para medir conversão pós-consulta)|
| createdAt  | DateTime | now                                           |

- NÃO armazenar produto clicado junto com identificação do paciente
  além do necessário; o objetivo é métrica agregada de parceria.

### Configuração

- Flag global `ondeComprarAtivo` (config do admin): liga/desliga a
  seção inteira sem deploy.

## Telas e fluxos

### 1. Paciente — pós-consulta

- Na tela de detalhes de consulta CONCLUÍDA, abaixo dos botões de
  download dos documentos, exibir a seção "Onde comprar" quando a
  flag estiver ativa:
  - Aviso de transparência (texto do princípio 3), sempre visível
  - Cards das farmácias parceiras ativas (logo, nome, botão
    "Visitar farmácia" com o link de afiliado, target _blank)
  - Se a consulta gerou receita com MIPs e o parceiro tiver
    linkTemplate: listar até 3 atalhos "Buscar {produto} na
    {farmácia}" usando o template — SOMENTE para itens MIP
  - Registrar AffiliateClick no clique (backend, não no client)
- A seção NUNCA aparece dentro do PDF nem no e-mail/notificação de
  documento disponível.

### 2. Admin — gestão de parceiros

- CRUD de PartnerPharmacy no dashboard do admin: nome, logo, URL,
  código de afiliado, template de busca, ativo, ordem.
- Toggle global "Onde comprar" (flag ondeComprarAtivo).
- Card simples de métricas: cliques por parceiro nos últimos 30
  dias (contagem agregada, sem dados de paciente).

### 3. Farmacêutico

- Nenhuma alteração. Nenhuma informação de afiliação visível.

## Segurança e privacidade

- Endpoint de clique valida sessão do paciente, mas grava apenas
  pharmacyId + consultaId; o redirect é server-side (evita expor o
  affiliateCode a manipulação e permite trocar códigos sem quebrar
  links antigos).
- Links de afiliado nunca contêm dados pessoais do paciente.
- CRUD de parceiros restrito ao admin (verificar role no backend).

## Critérios de aceite

- [ ] Receita em PDF permanece idêntica, sem qualquer elemento comercial
- [ ] Seção só aparece em consulta concluída e com a flag ativa
- [ ] Aviso de transparência sempre visível na seção
- [ ] Atalhos de produto só para MIPs; prescritos só link genérico
- [ ] Nenhum dado do paciente em URLs de parceiros
- [ ] Farmacêutico não vê nada de afiliação
- [ ] Admin gerencia parceiros e liga/desliga a seção sem deploy
- [ ] Cliques registrados e visíveis de forma agregada no admin
- [ ] Flag ondeComprarAtivo inicia DESLIGADA (default false)

## Fora de escopo (fase 2)

- Comparação de preços entre parceiros
- Cashback para o paciente
- Integração de estoque/disponibilidade do parceiro
