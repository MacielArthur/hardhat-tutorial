let provider;
let signer;
let contract;
let currentAccount = null;
let contractData = null;

// Elementos DOM
const connectWalletBtn = document.getElementById("connectWalletBtn");
const connectBtnText = document.getElementById("connectBtnText");
const votingStatusBadge = document.getElementById("votingStatusBadge");
const userCard = document.getElementById("userCard");
const userCodenameEl = document.getElementById("userCodename");
const userAddressEl = document.getElementById("userAddress");
const roleBadgeEl = document.getElementById("roleBadge");
const myBalanceEl = document.getElementById("myBalance");
const myVoteCountEl = document.getElementById("myVoteCount");
const superUserPanel = document.getElementById("superUserPanel");
const voteForm = document.getElementById("voteForm");
const voteTargetSelect = document.getElementById("voteTarget");
const voteAmountInput = document.getElementById("voteAmount");
const btnVotingOn = document.getElementById("btnVotingOn");
const btnVotingOff = document.getElementById("btnVotingOff");
const issueTokenForm = document.getElementById("issueTokenForm");
const issueTargetSelect = document.getElementById("issueTarget");
const issueAmountInput = document.getElementById("issueAmount");
const rankingTableBody = document.getElementById("rankingTableBody");
const refreshRankingBtn = document.getElementById("refreshRankingBtn");
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");
const toastIcon = document.getElementById("toastIcon");

function showToast(message, isError = false) {
  toast.className = `fixed bottom-6 right-6 max-w-md p-4 rounded-xl shadow-2xl text-sm flex items-center gap-3 z-50 transition-all duration-300 ${
    isError ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
  }`;
  toastIcon.className = isError ? "fa-solid fa-triangle-exclamation text-xl" : "fa-solid fa-circle-check text-xl";
  toastMsg.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 4500);
}

// Inicialização
async function init() {
  try {
    const res = await fetch("contract-data.json");
    contractData = await res.json();
  } catch (err) {
    console.error("Não foi possível carregar contract-data.json:", err);
  }

  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);

    // Se já estiver conectado previamente
    const accounts = await provider.send("eth_accounts", []);
    if (accounts.length > 0) {
      await setupAccount(accounts[0]);
    }

    window.ethereum.on("accountsChanged", async (accounts) => {
      if (accounts.length > 0) {
        await setupAccount(accounts[0]);
      } else {
        location.reload();
      }
    });

    window.ethereum.on("chainChanged", () => {
      location.reload();
    });
  } else {
    showToast("MetaMask não detectada. Instale a extensão MetaMask para usar a dApp.", true);
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("Por favor, instale a MetaMask para continuar.");
    return;
  }
  try {
    const accounts = await provider.send("eth_requestAccounts", []);
    if (accounts.length > 0) {
      await setupAccount(accounts[0]);
      showToast("Carteira conectada com sucesso!");
    }
  } catch (err) {
    console.error("Erro ao conectar carteira:", err);
    showToast("Falha ao conectar com o MetaMask: " + (err.message || err), true);
  }
}

async function setupAccount(accountAddress) {
  currentAccount = accountAddress;
  signer = await provider.getSigner();

  if (!contractData) {
    showToast("Dados do contrato não encontrados. Execute o deploy primeiro.", true);
    return;
  }

  contract = new ethers.Contract(contractData.address, contractData.abi, signer);

  // Atualiza visual do botão
  connectBtnText.textContent = `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`;
  userCard.classList.remove("hidden");
  userAddressEl.textContent = accountAddress;

  // Carrega dados da dApp
  await updateStatusAndUser();
  await loadStudentOptions();
  await updateRanking();
  setupEventListeners();
}

async function updateStatusAndUser() {
  if (!contract || !currentAccount) return;

  try {
    // 1. Status da votação
    const isVotingActive = await contract.voting();
    if (isVotingActive) {
      votingStatusBadge.className = "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
      votingStatusBadge.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span><span>Votação Aberta</span>';
    } else {
      votingStatusBadge.className = "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 bg-rose-500/20 text-rose-300 border border-rose-500/30";
      votingStatusBadge.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span><span>Votação Fechada / Pausada</span>';
    }

    // 2. Identificação do usuário
    const codename = await contract.addressToCodinome(currentAccount);
    userCodenameEl.textContent = codename && codename.length > 0 ? codename : "Não cadastrado";

    // 3. Checa permissões (Superusuário vs Aluno)
    const owner = await contract.owner();
    const robertaAddr = await contract.users("roberta");
    const isSuper = (
      currentAccount.toLowerCase() === owner.toLowerCase() ||
      currentAccount.toLowerCase() === robertaAddr.toLowerCase()
    );

    if (isSuper) {
      superUserPanel.classList.remove("hidden");
      roleBadgeEl.textContent = "Superusuário";
      roleBadgeEl.className = "px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40";
    } else {
      superUserPanel.classList.add("hidden");
      roleBadgeEl.textContent = "Aluno";
      roleBadgeEl.className = "px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40";
    }

    // 4. Saldo pessoal e contagem de votos
    const balance = await contract.balanceOf(currentAccount);
    myBalanceEl.textContent = balance.toString();

    if (codename && codename.length > 0) {
      const vCount = await contract.voteCount(codename);
      myVoteCountEl.textContent = vCount.toString();
    } else {
      myVoteCountEl.textContent = "0";
    }
  } catch (err) {
    console.error("Erro ao atualizar dados:", err);
  }
}

async function loadStudentOptions() {
  if (!contract) return;
  try {
    const students = await contract.getStudents();
    const prevVoteVal = voteTargetSelect.value;
    const prevIssueVal = issueTargetSelect.value;

    voteTargetSelect.innerHTML = '<option value="" disabled selected>Selecione um aluno...</option>';
    issueTargetSelect.innerHTML = '<option value="" disabled selected>Selecione um aluno...</option>';

    students.forEach((student) => {
      const opt1 = document.createElement("option");
      opt1.value = student;
      opt1.textContent = student;
      voteTargetSelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = student;
      opt2.textContent = student;
      issueTargetSelect.appendChild(opt2);
    });

    if (prevVoteVal) voteTargetSelect.value = prevVoteVal;
    if (prevIssueVal) issueTargetSelect.value = prevIssueVal;
  } catch (err) {
    console.error("Erro ao listar alunos:", err);
  }
}

async function updateRanking() {
  if (!contract) return;
  try {
    const students = await contract.getStudents();
    const rankingData = [];

    for (const student of students) {
      const balance = await contract.balanceOfCodinome(student);
      rankingData.push({
        codename: student,
        turings: Number(balance),
      });
    }

    // Ordena decrescente por quantidade de Turings
    rankingData.sort((a, b) => b.turings - a.turings);

    rankingTableBody.innerHTML = "";
    rankingData.forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-700/30 transition";

      let medal = `<span class="text-slate-400 font-bold">${index + 1}º</span>`;
      if (index === 0) medal = `<span class="text-amber-400 font-black">🥇 1º</span>`;
      else if (index === 1) medal = `<span class="text-slate-300 font-black">🥈 2º</span>`;
      else if (index === 2) medal = `<span class="text-amber-600 font-black">🥉 3º</span>`;

      tr.innerHTML = `
        <td class="py-3 px-3">${medal}</td>
        <td class="py-3 px-3 font-semibold text-slate-200">${item.codename}</td>
        <td class="py-3 px-3 text-right font-black text-amber-400">${item.turings} <span class="text-xs font-normal text-slate-400">TUR</span></td>
      `;
      rankingTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao montar ranking:", err);
  }
}

// Event Listeners do Contrato para atualização reativa
let listenersConfigured = false;
function setupEventListeners() {
  if (listenersConfigured || !contract) return;
  listenersConfigured = true;

  contract.on("Transfer", async () => {
    await updateStatusAndUser();
    await updateRanking();
  });

  contract.on("VoteCast", async (voter, target, amount) => {
    showToast(`Novo voto registrado: ${voter} votou ${amount} Turings em ${target}!`);
    await updateStatusAndUser();
    await updateRanking();
  });

  contract.on("VotingStatusChanged", async () => {
    await updateStatusAndUser();
  });
}

// Handlers de Ações
voteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const target = voteTargetSelect.value;
  const amount = parseInt(voteAmountInput.value, 10);

  if (!target) {
    showToast("Por favor selecione um aluno para votar.", true);
    return;
  }

  try {
    const tx = await contract.vote(target, amount);
    showToast("Transação de voto enviada! Aguardando confirmação...");
    await tx.wait();
    showToast(`Voto confirmado com sucesso para ${target}!`);
    voteForm.reset();
    await updateStatusAndUser();
    await updateRanking();
  } catch (err) {
    console.error("Erro ao votar:", err);
    const reason = err.reason || err.shortMessage || err.message;
    showToast("Erro ao votar: " + reason, true);
  }
});

btnVotingOn.addEventListener("click", async () => {
  try {
    const tx = await contract.votingOn();
    showToast("Enviando ativação da votação...");
    await tx.wait();
    showToast("Votação ativada com sucesso!");
    await updateStatusAndUser();
  } catch (err) {
    console.error(err);
    showToast("Erro ao ativar votação: " + (err.reason || err.message), true);
  }
});

btnVotingOff.addEventListener("click", async () => {
  try {
    const tx = await contract.votingOff();
    showToast("Enviando pausa da votação...");
    await tx.wait();
    showToast("Votação pausada com sucesso!");
    await updateStatusAndUser();
  } catch (err) {
    console.error(err);
    showToast("Erro ao pausar votação: " + (err.reason || err.message), true);
  }
});

issueTokenForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const target = issueTargetSelect.value;
  const amount = parseInt(issueAmountInput.value, 10);

  if (!target || isNaN(amount) || amount <= 0) {
    showToast("Dados inválidos para emissão de tokens.", true);
    return;
  }

  try {
    const tx = await contract.issueToken(target, amount);
    showToast(`Emitindo ${amount} Turings para ${target}...`);
    await tx.wait();
    showToast(`Sucesso! ${amount} Turings emitidos para ${target}.`);
    issueTokenForm.reset();
    await updateStatusAndUser();
    await updateRanking();
  } catch (err) {
    console.error(err);
    showToast("Erro ao emitir tokens: " + (err.reason || err.message), true);
  }
});

refreshRankingBtn.addEventListener("click", async () => {
  await updateStatusAndUser();
  await updateRanking();
  showToast("Dados atualizados com sucesso!");
});

connectWalletBtn.addEventListener("click", connectWallet);

// Inicializa no carregamento da página
window.addEventListener("DOMContentLoaded", init);

