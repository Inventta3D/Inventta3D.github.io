# Especificação (o que o sistema é e o que significa "pronto")

## Objetivo
Ajudar quem vende impressão 3D a calcular o custo de cada peça, montar orçamentos e enviá-los ao cliente, mantendo clientes e orçamentos salvos na própria conta.

## Usuário
Pequeno produtor de impressão 3D (hoje, o próprio dono). Usa no computador e no celular (PWA instalada).

## Escopo atual
1. **Orçamento em 5 etapas**: pedido, material, impressão, trabalho, preço. Vários itens por pedido. Desconto por porcentagem, valor fixo ou valor final.
2. **Compartilhar**: imagem para WhatsApp, PDF e texto, com ou sem composição de custos. Validade opcional.
3. **Orçamentos salvos**: buscar, abrir, editar, excluir (com desfazer).
4. **Clientes**: cadastrar, consultar, editar, excluir; escolher cliente salvo no orçamento; salvar cliente a partir do orçamento sem duplicar.
5. **Conta**: login com e-mail e senha ou Google, recuperação de senha, tema claro/escuro, foto do Google no avatar.
6. **Instalação**: PWA, instalada direto do navegador (Chrome/Edge: "Instalar app"; Safari no iPhone: "Adicionar à Tela de Início"), sem APK e sem loja de aplicativos.

## Fora do escopo (por enquanto)
Estoque de filamentos, vários usuários por conta, pagamentos, nota fiscal.

## Critérios de aceite (o que prova que funciona)
- Preencher as 5 etapas e clicar em "Gerar orçamento" mostra o total e permite salvar, copiar texto, baixar PDF e preparar o WhatsApp.
- Cada usuário só vê e altera os próprios orçamentos e clientes.
- Entrar com Google, sair da conta e entrar de novo funciona sem mensagem de erro.
- O formulário de cada etapa cabe numa tela de 860 px de altura, sem barra de rolagem; sem rolagem horizontal no celular.
- `npm test` passa.
- O app instala pelo navegador (PWA) e abre em tela cheia, no celular e no computador.
