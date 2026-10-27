# 🤖 Diretrizes para Agentes de Desenvolvimento (AGENTS.md)

Este documento define as convenções, regras de arquitetura, contexto do projeto e checklist de qualidade para agentes de IA que atuarem neste repositório.

---

## 🎯 Objetivo do Projeto
Desenvolvimento e manutenção da dApp de votação **Turing dApp** e seu respectivo Smart Contract em Solidity, utilizando a rede blockchain local do Hardhat e frontend web moderno (HTML5 + Tailwind CSS + Ethers.js v6).

---

## 📌 Contexto e Regras de Negócio Inegociáveis

1. **Smart Contract `contracts/Turing.sol`**:
   - **Estratégia de Supply**: Uncapped Lazy Supply (`totalSupply` inicia em 0, tokens só são emitidos sob demanda via `vote` ou `issueToken`).
   - **Mapeamento de Usuários**: `users(codinome => address)` inicializado no `constructor` com a tabela oficial (roberta + 5 alunos).
   - **Mapeamento Reverso**: `addressToCodinome(address => codinome)` deve sempre ser mantido sincronizado com `users`.
   - **Controle de Acesso**: O modifier `onlyOwnerOrProfessor` restringe chamadas críticas a `owner` ou `users["roberta"]`.
   - **Votação**:
     - Status controlado por `voting` (`bool`).
     - Apenas usuários pré-autorizados podem votar.
     - Voto em si mesmo é proibido (`voterCodinome != targetCodinome`).
     - Quantidade permitida: estritamente 1 ou 2 Turings.
     - Voto duplicado no mesmo alvo é proibido (`hasVote[voter][target]`).
     - A cada 10 votos realizados por um mesmo usuário, 1 Turing de bonificação deve ser mintado para ele.

2. **Frontend `frontend/`**:
   - Manter a arquitetura estática leve em `index.html` e `app.js` sem build steps pesados.
   - Sempre consumir os dados do contrato a partir de `frontend/contract-data.json`, gerado pelo script `scripts/deploy.js`.
   - Exibir dinamicamente o painel de Superusuário apenas quando o endereço ativo no MetaMask for o `owner` ou a `roberta`.
   - O select de destinatários de votos nunca deve exibir a professora `roberta`.

---

## 🛠️ Comandos Padrão

- **Compilar Contratos**: `npx hardhat compile`
- **Rodar Testes**: `npx hardhat test test/Turing.js`
- **Executar Script de Deploy**: `npx hardhat --network localhost run scripts/deploy.js`
- **Servir Frontend**: `npx serve frontend -l 3000` (ou `python3 -m http.server 3000 --directory frontend`)

---

## 📋 Checklist de Verificação Antes de Finalizar Tarefas
- [ ] O contrato compila sem warnings ou erros com `solc 0.8.28`.
- [ ] A suíte de 15 testes unitários em `test/Turing.js` passa integralmente (`15 passing`).
- [ ] O script de deploy exporta o arquivo `frontend/contract-data.json` com o endereço e ABI corretos.
- [ ] O frontend responde adequadamente a mudanças de contas e redes no MetaMask.
- [ ] Nenhuma chave privada real ou dado sensível foi comitado.
- [ ] **REGRA DE GIT MANDATÓRIA**: O agente NUNCA deve executar `git push`. Commits locais podem ser criados, mas o `git push` para o repositório remoto deve ser realizado sempre e exclusivamente de forma manual pelo usuário.

