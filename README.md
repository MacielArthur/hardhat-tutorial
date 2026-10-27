# 🪙 Turing dApp - Sistema de Votação e Criptomoeda

Projeto de Smart Contract e dApp para votação nos projetos finais da disciplina, desenvolvido sobre o framework **Hardhat** e blockchain local Ethereum (EVM).

---

## 📋 Sumário
- [1. Visão Geral](#1-visão-geral)
- [2. Tabela Oficial de Usuários e Carteiras](#2-tabela-oficial-de-usuários-e-carteiras)
- [3. Regras de Negócio do Smart Contract (`Turing.sol`)](#3-regras-de-negócio-do-smart-contract-turingsol)
- [4. Frontend da Aplicação (dApp)](#4-frontend-da-aplicação-dapp)
- [5. Guia Passo a Passo de Execução](#5-guia-passo-a-passo-de-execução)
- [6. Configuração da MetaMask](#6-configuração-da-metamask)
- [7. Testes Automatizados](#7-testes-automatizados)
- [8. Solução de Problemas Comuns (Troubleshooting)](#8-solução-de-problemas-comuns-troubleshooting)

---

## 1. Visão Geral
O projeto implementa:
1. **Smart Contract `Turing.sol`**: Um token com emissão sob demanda (*Uncapped Lazy Supply*), controle de permissões por codinomes e lógica restrita de votação com bonificação.
2. **Frontend Web Moderno**: Interface em HTML5 + Tailwind CSS + Ethers.js v6, conectada ao MetaMask e com painéis dinâmicos para alunos e superusuários.

---

## 2. Tabela Oficial de Usuários e Carteiras (Atividade 13)

No Hardhat local (`npx hardhat node`), cada conta possui um endereço e uma chave privada pré-definida com 10.000 ETH de saldo inicial:

| Papel | Codinome | Endereço Público (Ethereum) | Hardhat Account |
| :--- | :--- | :--- | :--- |
| **Deployer / Owner** | `owner` | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Conta #0 |
| **Superusuária** | `roberta` | `0x502542668aF09fa7aea52174b9965A7799343Df7` | Carteira da Professora |
| **Aluno 1** | `nome1` | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Conta #1 |
| **Aluno 2** | `nome2` | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Conta #2 |
| **Aluno 3** | `nome3` | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | Conta #3 |
| **Aluno 4** | `nome4` | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | Conta #4 |
| **Aluno 5** | `nome5` | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | Conta #5 |

> **Nota:** A professora `roberta` e o `owner` possuem privilégios de **Superusuário**. A lista de opções para votação (`getStudents`) contempla estritamente os alunos (`nome1` a `nome5`), excluindo a professora.

---

## 3. Regras de Negócio do Smart Contract (`Turing.sol`)

### 3.1. Estratégia de Suprimento
- **Uncapped Lazy Supply**: Não há minting inicial no construtor (`totalSupply = 0` no deploy). Os tokens são criados conforme ocorrem votos ou emissões administrativas.

### 3.2. Controle de Permissões
- `onlyOwnerOrProfessor`: Permite execução apenas pelo `owner` (deployer) ou pela professora `roberta`.

### 3.3. Métodos Públicos
- `updateUser(string codinome, address user_addr)`:
  - Restrito a Owner/Professora;
  - Exige codinome não vazio e endereço válido;
  - Atualiza o endereço do codinome no mapping `users` e mapeamento reverso;
  - **Ativa a votação** (`voting = true`).
- `votingOn()`:
  - Restrito a Owner/Professora;
  - Seta `voting = true`.
- `votingOff()`:
  - Restrito a Owner/Professora;
  - Seta `voting = false` (pausa a votação).
- `issueToken(string codinome, uint256 qtde_de_Turings)`:
  - Restrito a Owner/Professora;
  - Minta `qtde_de_Turings` diretamente na carteira do aluno/usuário indicado.
- `vote(string codinome, uint256 qtde_de_Turings)`:
  - Exige votação ativa (`voting == true`);
  - Apenas usuários pré-autorizados podem votar;
  - **Não** pode votar em si mesmo;
  - `qtde_de_Turings` deve ser **1 ou 2**;
  - Um mesmo usuário **só pode votar uma única vez** no mesmo codinome (controlado por `mapping(string => mapping(string => bool)) public hasVote`);
  - Minta os Turings votados para o codinome de destino;
  - **Bonificação**: A cada 10 votos computados por um usuário, ele recebe automaticamente **1 Turing** de bonificação em sua própria carteira.

---

## 4. Frontend da Aplicação (dApp)

Localizado em [`frontend/`](./frontend):
- `index.html`: Interface construída com Tailwind CSS (design dark, responsivo e limpo).
- `app.js`: Lógica em Ethers.js v6 com:
  - Detecção automática de conta conectada via MetaMask;
  - Alternância de telas: Aluno vê apenas votação e ranking; Superusuário tem acesso aos botões `votingOn`, `votingOff` e formulário de `issueToken`;
  - Select de votação filtrado exclusivamente para alunos;
  - Placar/Ranking atualizado em tempo real via eventos (`Transfer`, `VoteCast`, `VotingStatusChanged`) e polling.

---

## 5. Guia Passo a Passo de Execução

### Passo 1: Iniciar o Nó Local do Hardhat
Abra um terminal no diretório do projeto e execute:
```bash
npx hardhat node
```
O Hardhat iniciará a blockchain local em `http://127.0.0.1:8545` e exibirá as 20 contas com suas chaves privadas.

### Passo 2: Fazer o Deploy do Contrato Turing
Em **outro terminal**, execute o script de deploy:
```bash
npx hardhat --network localhost run scripts/deploy.js
```
Esse script compila o contrato, faz o deploy na rede local e exporta automaticamente o endereço e a ABI para `frontend/contract-data.json`.

### Passo 3: Subir o Servidor Web do Frontend
No terminal, inicie um servidor estático simples para servir a pasta `frontend`:
```bash
npx serve frontend -l 3000
# ou com Python:
python3 -m http.server 3000 --directory frontend
```
Acesse a aplicação no navegador em: `http://localhost:3000`.

---

## 6. Configuração da MetaMask

1. Abra a extensão MetaMask.
2. Adicione ou selecione a rede local:
   - **Nome da Rede**: Hardhat Localhost
   - **Novo URL do RPC**: `http://127.0.0.1:8545`
   - **ID da cadeia (Chain ID)**: `31337`
   - **Símbolo da moeda**: `ETH` (ou `GO`)
3. **Importar Contas de Teste**:
   - Para testar como **Superusuário (Deployer)**, importe a Chave Privada da Conta #0:
     `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - Para testar como **Aluno (ex: nome1)**, importe a Chave Privada da Conta #1:
     `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
   - Para testar como **Aluno (ex: nome2)**, importe a Chave Privada da Conta #2:
     `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`

---

## 7. Testes Automatizados

O contrato conta com 15 testes unitários cobrindo 100% dos requisitos de negócio. Para executá-los:
```bash
npx hardhat test test/Turing.js
```
Resultado esperado:
```
  Turing Smart Contract (Atividade 13)
    Inicialização e Uncapped Lazy Supply
      ✔ Não deve emitir tokens no deploy (Lazy Supply com totalSupply = 0)
      ✔ Deve definir corretamente o owner como quem fez o deploy
      ✔ Deve inicializar a votação como inativa (false)
      ✔ Deve carregar todos os usuários pré-autorizados da tabela
      ✔ Deve listar apenas os alunos em getStudents (sem a professora)
    Controle de Acesso e Gestão de Votação (Owner e Professora)
      ✔ Deve permitir que o owner e a professora ativem a votação com votingOn()
      ✔ Deve impedir que usuários comuns ou não autorizados alterem status da votação
      ✔ updateUser() deve atualizar o mapping, setar voting = true e exigir codinome não vazio
      ✔ issueToken() deve mintar Turings apenas se chamado por owner ou professora
    Regras da Função vote()
      ✔ Deve falhar se a votação estiver desativada
      ✔ Deve falhar se o chamador não for um usuário pré-autorizado
      ✔ Deve impedir que um usuário vote em si mesmo
      ✔ Deve exigir quantidade entre 1 e 2 Turings
      ✔ Deve realizar o voto, mintar Turings para o alvo e impedir voto duplicado no mesmo alvo
      ✔ Regra dos 10 votos: a cada 10 vezes que votar, deve bonificar com 1 Turing

  15 passing
```

---

## 8. Solução de Problemas Comuns (Troubleshooting)

- **Erro de Nonce no MetaMask ("Nonce too high" ou transação pendente infinita)**:
  - Causa: Você reiniciou o `npx hardhat node`, mas o MetaMask ainda lembra do contador de transações anterior.
  - Solução: No MetaMask, vá em **Configurações > Avançado > Limpar dados de atividade da conta / Redefinir conta**.
- **dApp com status "Votação Fechada"**:
  - Conecte com a conta do `owner` (Conta #0) ou da professora `roberta` e clique em **"Ativar Votação (votingOn)"**.

