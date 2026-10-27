const path = require("path");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("==================================================");
  console.log("Realizando deploy do contrato Turing com a conta:", deployer.address);
  console.log("Saldo da conta deployer:", (await ethers.provider.getBalance(deployer.address)).toString());
  console.log("==================================================");

  const Turing = await ethers.getContractFactory("Turing");
  const turing = await Turing.deploy();
  await turing.waitForDeployment();

  const contractAddress = await turing.getAddress();
  console.log(">>> Contrato Turing deployado com sucesso no endereco:", contractAddress);

  // Salva o endereco e ABI para o Frontend consumir diretamente
  saveFrontendFiles(turing, contractAddress);
}

function saveFrontendFiles(turing, contractAddress) {
  const frontendDir = path.join(__dirname, "..", "frontend");

  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const TuringArtifact = artifacts.readArtifactSync("Turing");

  const contractData = {
    address: contractAddress,
    abi: TuringArtifact.abi,
  };

  fs.writeFileSync(
    path.join(frontendDir, "contract-data.json"),
    JSON.stringify(contractData, undefined, 2)
  );

  console.log(">>> Dados do contrato exportados para frontend/contract-data.json");
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro no deploy:", error);
    process.exit(1);
  });

