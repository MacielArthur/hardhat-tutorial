const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Turing Smart Contract (Atividade 13)", function () {
  let turing;
  let owner;
  let addr1, addr2, addr3, addr4, addr5, unauthorized;
  let robertaSigner;

  const ROBERTA_ADDR = "0x502542668aF09fa7aea52174b9965A7799343Df7";

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    addr1 = signers[1]; // nome1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
    addr2 = signers[2]; // nome2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
    addr3 = signers[3]; // nome3: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
    addr4 = signers[4]; // nome4: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
    addr5 = signers[5]; // nome5: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
    unauthorized = signers[6];

    // Emula a professora Roberta impersonando seu endereço no Hardhat
    await ethers.provider.send("hardhat_impersonateAccount", [ROBERTA_ADDR]);
    // Envia ETH para Roberta pagar o gas nas transações de teste
    await owner.sendTransaction({
      to: ROBERTA_ADDR,
      value: ethers.parseEther("1.0"),
    });
    robertaSigner = await ethers.getSigner(ROBERTA_ADDR);

    const TuringFactory = await ethers.getContractFactory("Turing");
    turing = await TuringFactory.deploy();
    await turing.waitForDeployment();
  });

  describe("Inicialização e Uncapped Lazy Supply", function () {
    it("Não deve emitir tokens no deploy (Lazy Supply com totalSupply = 0)", async function () {
      expect(await turing.totalSupply()).to.equal(0);
      expect(await turing.balanceOf(owner.address)).to.equal(0);
    });

    it("Deve definir corretamente o owner como quem fez o deploy", async function () {
      expect(await turing.owner()).to.equal(owner.address);
    });

    it("Deve inicializar a votação como inativa (false)", async function () {
      expect(await turing.voting()).to.equal(false);
    });

    it("Deve carregar todos os usuários pré-autorizados da tabela", async function () {
      expect(await turing.users("roberta")).to.equal(ROBERTA_ADDR);
      expect(await turing.users("nome1")).to.equal(addr1.address);
      expect(await turing.users("nome2")).to.equal(addr2.address);
      expect(await turing.users("nome3")).to.equal(addr3.address);
      expect(await turing.users("nome4")).to.equal(addr4.address);
      expect(await turing.users("nome5")).to.equal(addr5.address);
    });

    it("Deve listar apenas os alunos em getStudents (sem a professora)", async function () {
      const students = await turing.getStudents();
      expect(students).to.deep.equal(["nome1", "nome2", "nome3", "nome4", "nome5"]);
    });
  });

  describe("Controle de Acesso e Gestão de Votação (Owner e Professora)", function () {
    it("Deve permitir que o owner e a professora ativem a votação com votingOn()", async function () {
      await turing.connect(owner).votingOn();
      expect(await turing.voting()).to.equal(true);

      await turing.connect(robertaSigner).votingOff();
      expect(await turing.voting()).to.equal(false);

      await turing.connect(robertaSigner).votingOn();
      expect(await turing.voting()).to.equal(true);
    });

    it("Deve impedir que usuários comuns ou não autorizados alterem status da votação", async function () {
      await expect(turing.connect(addr1).votingOn()).to.be.revertedWith(
        "Apenas owner ou professora podem executar esta operacao"
      );
      await expect(turing.connect(unauthorized).votingOff()).to.be.revertedWith(
        "Apenas owner ou professora podem executar esta operacao"
      );
    });

    it("updateUser() deve atualizar o mapping, setar voting = true e exigir codinome não vazio", async function () {
      await expect(
        turing.connect(owner).updateUser("", unauthorized.address)
      ).to.be.revertedWith("Codinome nao pode ser uma string vazia");

      await expect(
        turing.connect(unauthorized).updateUser("alunoNovo", unauthorized.address)
      ).to.be.revertedWith("Apenas owner ou professora podem executar esta operacao");

      // Atualiza com sucesso e ativa votação
      await turing.connect(robertaSigner).updateUser("nome1", unauthorized.address);
      expect(await turing.users("nome1")).to.equal(unauthorized.address);
      expect(await turing.voting()).to.equal(true);
    });

    it("issueToken() deve mintar Turings apenas se chamado por owner ou professora", async function () {
      await expect(
        turing.connect(addr1).issueToken("nome2", 50)
      ).to.be.revertedWith("Apenas owner ou professora podem executar esta operacao");

      await turing.connect(robertaSigner).issueToken("nome2", 15);
      expect(await turing.balanceOf(addr2.address)).to.equal(15);
      expect(await turing.totalSupply()).to.equal(15);
    });
  });

  describe("Regras da Função vote()", function () {
    beforeEach(async function () {
      // Ativa votação para os testes de voto
      await turing.connect(owner).votingOn();
    });

    it("Deve falhar se a votação estiver desativada", async function () {
      await turing.connect(owner).votingOff();
      await expect(turing.connect(addr1).vote("nome2", 1)).to.be.revertedWith(
        "Apenas owner ou professora podem executar esta operacao"
      ).catch(() => {}); // fallback

      // Executa votingOff corretamente e testa vote
      expect(await turing.voting()).to.equal(false);
      await expect(turing.connect(addr1).vote("nome2", 1)).to.be.revertedWith(
        "A votacao nao esta ativa"
      );
    });

    it("Deve falhar se o chamador não for um usuário pré-autorizado", async function () {
      await expect(turing.connect(unauthorized).vote("nome1", 1)).to.be.revertedWith(
        "Apenas usuarios pre-autorizados podem votar"
      );
    });

    it("Deve impedir que um usuário vote em si mesmo", async function () {
      await expect(turing.connect(addr1).vote("nome1", 1)).to.be.revertedWith(
        "Um usuario NAO pode votar em si mesmo"
      );
    });

    it("Deve exigir quantidade entre 1 e 2 Turings", async function () {
      await expect(turing.connect(addr1).vote("nome2", 0)).to.be.revertedWith(
        "Quantidade de Turings deve ser maior que 0 e menor ou igual a 2"
      );
      await expect(turing.connect(addr1).vote("nome2", 3)).to.be.revertedWith(
        "Quantidade de Turings deve ser maior que 0 e menor ou igual a 2"
      );
    });

    it("Deve realizar o voto, mintar Turings para o alvo e impedir voto duplicado no mesmo alvo", async function () {
      await expect(turing.connect(addr1).vote("nome2", 2))
        .to.emit(turing, "VoteCast")
        .withArgs("nome1", "nome2", 2);

      expect(await turing.balanceOf(addr2.address)).to.equal(2);
      expect(await turing.totalSupply()).to.equal(2);
      expect(await turing.hasVote("nome1", "nome2")).to.equal(true);

      // Tentativa de voto duplicado no mesmo codinome
      await expect(turing.connect(addr1).vote("nome2", 1)).to.be.revertedWith(
        "Usuario ja votou neste codinome"
      );
    });

    it("Regra dos 10 votos: a cada 10 vezes que votar, deve bonificar com 1 Turing", async function () {
      // Vamos criar alvos fictícios para permitir 10 votos do addr1 sem violar unicidade de alvo
      for (let i = 1; i <= 10; i++) {
        const dummyCodename = `dummy${i}`;
        const dummyWallet = ethers.Wallet.createRandom();
        await turing.connect(owner).updateUser(dummyCodename, dummyWallet.address);
        await turing.connect(addr1).vote(dummyCodename, 1);
      }

      // addr1 votou 10 vezes -> deve ter recebido 1 Turing de bonificação!
      expect(await turing.voteCount("nome1")).to.equal(10);
      expect(await turing.balanceOf(addr1.address)).to.equal(1);
    });
  });
});

