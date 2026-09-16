# Racha FC

Sistema multi-tenant para organizar rachas de futebol.

## Stack
- Next.js + React
- Supabase Auth + PostgreSQL + Storage
- Render

## Recursos previstos no banco
- Vários grupos/rachas
- Login do organizador
- Jogadores com foto
- Racha por data
- Times e cores
- Jogador de linha ou goleiro
- Goleiros rotativos
- Gols, assistências e gols sofridos
- Entrada e saída de jogadores
- Troca de jogador entre times para cobrir saída
- Histórico
- Ranking diário de artilheiro e garçom
- Overall calculado

## Publicação

1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Crie um usuário em Authentication > Users.
4. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. No Render:
   - Build: `npm install && npm run build`
   - Start: `npm run start`
   - Node: 20
6. Configure as mesmas variáveis no Render.

## Overall

O cálculo inicial foi deixado em uma VIEW no PostgreSQL para ser fácil de alterar:
- gols aumentam o overall;
- assistências aumentam;
- presença aumenta;
- gols sofridos enquanto goleiro reduzem;
- gols marcados por quem também atua como goleiro continuam contando.

Os pesos são uma base inicial e podem ser ajustados no SQL.

## Próxima implementação de interface

A base já está preparada para a tela completa de operação do racha. O fluxo recomendado é:
1. criar o racha do dia;
2. selecionar presentes;
3. sortear times;
4. definir cores;
5. registrar goleiros por rodada;
6. registrar gols/assistências;
7. registrar saída e mover um jogador de outro time;
8. encerrar e salvar no histórico.
