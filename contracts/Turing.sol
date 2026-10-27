// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "hardhat/console.sol";

/**
 * @title Turing
 * @notice Contrato da Criptomoeda Turing e dApp de Votação (Atividade 13)
 * @dev Implementa a estratégia Uncapped Lazy Supply sem mint inicial no construtor.
 */
contract Turing {
    string public name = "Turing";
    string public symbol = "TUR";

    uint256 public totalSupply;
    address public owner;
    bool public voting;

    // Balances por endereço
    mapping(address => uint256) internal balances;

    // Controle de acesso: Codinome => Endereço
    mapping(string => address) public users;

    // Mapeamento reverso para validação rápida de quem chama: Endereço => Codinome
    mapping(address => string) public addressToCodinome;

    // Lista de alunos para ranking e select do frontend (exclui a professora)
    string[] public studentList;

    // Histórico de votos para impedir voto duplicado no mesmo alvo:
    // Eleitor (codinome) => Alvo (codinome) => JaVotou (bool)
    mapping(string => mapping(string => bool)) public hasVote;

    // Contador de votos de cada usuário para conceder bônus a cada 10 votos
    mapping(string => uint256) public voteCount;

    // Eventos
    event Transfer(address indexed from, address indexed to, uint256 value);
    event VoteCast(string indexed voter, string indexed target, uint256 amount);
    event VotingStatusChanged(bool active);
    event UserUpdated(string indexed codinome, address indexed newAddress);
    event BonusAwarded(string indexed voter, uint256 amount);

    /**
     * @dev Modifier para restringir métodos ao Owner ou à Professora (roberta).
     */
    modifier onlyOwnerOrProfessor() {
        require(
            msg.sender == owner || msg.sender == users["roberta"],
            "Apenas owner ou professora podem executar esta operacao"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        voting = false; // Votação começa inativa até ser ligada

        // Inicialização com os dados da tabela oficial (Atividade 13)
        _registerInitialUser("roberta", 0x502542668aF09fa7aea52174b9965A7799343Df7, false);
        _registerInitialUser("nome1", 0x70997970C51812dc3A010C7d01b50e0d17dc79C8, true);
        _registerInitialUser("nome2", 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, true);
        _registerInitialUser("nome3", 0x90F79bf6EB2c4f870365E785982E1f101E93b906, true);
        _registerInitialUser("nome4", 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65, true);
        _registerInitialUser("nome5", 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc, true);
    }

    function _registerInitialUser(string memory codinome, address userAddr, bool isStudent) internal {
        users[codinome] = userAddr;
        addressToCodinome[userAddr] = codinome;
        if (isStudent) {
            studentList.push(codinome);
        }
    }

    /**
     * @notice Atualiza o endereço de um usuário no mapping `users`.
     * @dev Seta a variável `voting` para true conforme especificação.
     */
    function updateUser(string memory codinome, address user_addr) external onlyOwnerOrProfessor {
        require(bytes(codinome).length > 0, "Codinome nao pode ser uma string vazia");
        require(user_addr != address(0), "Endereco invalido");

        address oldAddr = users[codinome];
        if (oldAddr != address(0)) {
            delete addressToCodinome[oldAddr];
        }

        users[codinome] = user_addr;
        addressToCodinome[user_addr] = codinome;

        voting = true;

        emit UserUpdated(codinome, user_addr);
        emit VotingStatusChanged(true);
    }

    /**
     * @notice Ativa a votação.
     */
    function votingOn() external onlyOwnerOrProfessor {
        voting = true;
        emit VotingStatusChanged(true);
    }

    /**
     * @notice Pausa/desativa a votação.
     */
    function votingOff() external onlyOwnerOrProfessor {
        voting = false;
        emit VotingStatusChanged(false);
    }

    /**
     * @notice Emite (minta) tokens para o codinome especificado.
     */
    function issueToken(string memory codinome, uint256 qtde_de_Turings) external onlyOwnerOrProfessor {
        require(qtde_de_Turings > 0, "Quantidade deve ser maior que zero");
        address targetAddr = users[codinome];
        require(targetAddr != address(0), "Usuario nao encontrado no mapping");

        balances[targetAddr] += qtde_de_Turings;
        totalSupply += qtde_de_Turings;

        emit Transfer(address(0), targetAddr, qtde_de_Turings);
    }

    /**
     * @notice Vota em um codinome gerando Turings para ele.
     * @dev A cada 10 votos, o votante ganha 1 Turing de bonificação.
     */
    function vote(string memory codinome, uint256 qtde_de_Turings) external {
        require(voting, "A votacao nao esta ativa");

        string memory voterCodinome = addressToCodinome[msg.sender];
        require(bytes(voterCodinome).length > 0, "Apenas usuarios pre-autorizados podem votar");
        require(
            keccak256(bytes(voterCodinome)) != keccak256(bytes(codinome)),
            "Um usuario NAO pode votar em si mesmo"
        );
        require(
            qtde_de_Turings > 0 && qtde_de_Turings <= 2,
            "Quantidade de Turings deve ser maior que 0 e menor ou igual a 2"
        );
        require(!hasVote[voterCodinome][codinome], "Usuario ja votou neste codinome");

        address targetAddr = users[codinome];
        require(targetAddr != address(0), "Codinome alvo nao encontrado");

        // Registra o voto
        hasVote[voterCodinome][codinome] = true;

        // Minta a quantidade para o alvo
        balances[targetAddr] += qtde_de_Turings;
        totalSupply += qtde_de_Turings;
        emit Transfer(address(0), targetAddr, qtde_de_Turings);
        emit VoteCast(voterCodinome, codinome, qtde_de_Turings);

        // Lógica de bonificação: a cada 10 votos realizados, ganha 1 Turing
        voteCount[voterCodinome] += 1;
        if (voteCount[voterCodinome] % 10 == 0) {
            balances[msg.sender] += 1;
            totalSupply += 1;
            emit Transfer(address(0), msg.sender, 1);
            emit BonusAwarded(voterCodinome, 1);
        }
    }

    /**
     * @notice Retorna o saldo de Turings de uma conta.
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    /**
     * @notice Retorna o saldo de Turings a partir do codinome.
     */
    function balanceOfCodinome(string memory codinome) external view returns (uint256) {
        address userAddr = users[codinome];
        return balances[userAddr];
    }

    /**
     * @notice Retorna a lista de codinomes dos alunos (exclui a professora).
     */
    function getStudents() external view returns (string[] memory) {
        return studentList;
    }
}

