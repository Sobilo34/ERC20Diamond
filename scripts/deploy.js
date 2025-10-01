const { ethers, run, network } = require("hardhat");

async function verify(address, constructorArguments) {
  if (network.name === "hardhat" || network.name === "localhost") {
    return;
  }
  
  console.log(`Verifying contract at ${address}...`);
  try {
    await run("verify:verify", {
      address: address,
      constructorArguments: constructorArguments,
    });
    console.log(`✅ Verified: https://sepolia-blockscout.lisk.com/address/${address}`);
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log(`✅ Already verified: https://sepolia-blockscout.lisk.com/address/${address}`);
    } else {
      console.log(`❌ Verification failed: ${e.message}`);
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  console.log("Deploying contracts to network:", network.name);
  console.log("Deployer address:", deployerAddress);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployerAddress)), "ETH\n");

  // Deploy facets
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.waitForDeployment();
  const diamondCutFacetAddress = await diamondCutFacet.getAddress();

  const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
  const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
  await diamondLoupeFacet.waitForDeployment();
  const diamondLoupeFacetAddress = await diamondLoupeFacet.getAddress();

  const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
  const ownershipFacet = await OwnershipFacet.deploy();
  await ownershipFacet.waitForDeployment();
  const ownershipFacetAddress = await ownershipFacet.getAddress();

  const ERC20Facet = await ethers.getContractFactory("ERC20Facet");
  const erc20Facet = await ERC20Facet.deploy();
  await erc20Facet.waitForDeployment();
  const erc20FacetAddress = await erc20Facet.getAddress();

  const SwapFacet = await ethers.getContractFactory("SwapFacet");
  const swapFacet = await SwapFacet.deploy();
  await swapFacet.waitForDeployment();
  const swapFacetAddress = await swapFacet.getAddress();

  const MultiSigFacet = await ethers.getContractFactory("MultiSigFacet");
  const multiSigFacet = await MultiSigFacet.deploy();
  await multiSigFacet.waitForDeployment();
  const multiSigFacetAddress = await multiSigFacet.getAddress();

  const TokenURIFacet = await ethers.getContractFactory("TokenURIFacet");
  const tokenURIFacet = await TokenURIFacet.deploy();
  await tokenURIFacet.waitForDeployment();
  const tokenURIFacetAddress = await tokenURIFacet.getAddress();

  // Deploy Diamond with DiamondCutFacet
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(deployerAddress, diamondCutFacetAddress);
  await diamond.waitForDeployment();
  const diamondAddress = await diamond.getAddress();

  // Prepare facet cuts
  const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

  const cuts = [];

  // DiamondLoupeFacet
  const loupeFacetSelectors = getSelectors(diamondLoupeFacet);
  cuts.push({
    facetAddress: diamondLoupeFacetAddress,
    action: FacetCutAction.Add,
    functionSelectors: loupeFacetSelectors
  });

  // OwnershipFacet
  const ownershipFacetSelectors = getSelectors(ownershipFacet);
  cuts.push({
    facetAddress: ownershipFacetAddress,
    action: FacetCutAction.Add,
    functionSelectors: ownershipFacetSelectors
  });

  // ERC20Facet
  const erc20FacetSelectors = getSelectors(erc20Facet);
  cuts.push({
    facetAddress: erc20FacetAddress,
    action: FacetCutAction.Add,
    functionSelectors: erc20FacetSelectors
  });

  // SwapFacet
  const swapFacetSelectors = getSelectors(swapFacet);
  cuts.push({
    facetAddress: swapFacetAddress,
    action: FacetCutAction.Add,
    functionSelectors: swapFacetSelectors
  });

  // MultiSigFacet
  const multiSigFacetSelectors = getSelectors(multiSigFacet);
  cuts.push({
    facetAddress: multiSigFacetAddress,
    action: FacetCutAction.Add,
    functionSelectors: multiSigFacetSelectors
  });

  // TokenURIFacet
  const tokenURIFacetSelectors = getSelectors(tokenURIFacet);
  cuts.push({
    facetAddress: tokenURIFacetAddress,
    action: FacetCutAction.Add,
    functionSelectors: tokenURIFacetSelectors
  });

  // Deploy DiamondInit
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.waitForDeployment();
  const diamondInitAddress = await diamondInit.getAddress();

  // Prepare initialization data
  const initArgs = {
    name: "BLL Token",
    symbol: "BLL",
    initialSupply: ethers.parseEther("1000000"),
    tokenPriceInWei: ethers.parseEther("0.001"),
    description: "BLL Token - A fully upgradeable diamond proxy ERC20 token with swap, multisig, and onchain SVG capabilities",
    externalUrl: "https://bll-token.example.com",
    backgroundColor: "667eea"
  };

  const functionCall = diamondInit.interface.encodeFunctionData("init", [initArgs]);

  // Execute diamond cut to add all facets
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamondAddress);
  const tx = await diamondCut.diamondCut(cuts, diamondInitAddress, functionCall);
  await tx.wait();

  console.log("\n⏳ Waiting for block confirmations before verification...\n");
  
  // Verify all contracts
  if (network.name !== "hardhat" && network.name !== "localhost") {
    await verify(diamondCutFacetAddress, []);
    await verify(diamondLoupeFacetAddress, []);
    await verify(ownershipFacetAddress, []);
    await verify(erc20FacetAddress, []);
    await verify(swapFacetAddress, []);
    await verify(multiSigFacetAddress, []);
    await verify(tokenURIFacetAddress, []);
    await verify(diamondInitAddress, []);
    await verify(diamondAddress, [deployerAddress, diamondCutFacetAddress]);
  }

  // Log deployed and verified contract addresses
  console.log("\n=== Diamond Proxy Deployment ===");
  console.log("Diamond (Proxy):", diamondAddress);
  if (network.name === "lisk") {
    console.log("View on Blockscout: https://sepolia-blockscout.lisk.com/address/" + diamondAddress);
  }
  
  console.log("\n=== Implementation Contracts ===");
  console.log("DiamondCutFacet:", diamondCutFacetAddress);
  if (network.name === "lisk") {
    console.log("  → https://sepolia-blockscout.lisk.com/address/" + diamondCutFacetAddress);
  }
  
  console.log("DiamondLoupeFacet:", diamondLoupeFacetAddress);
  if (network.name === "lisk") {
    console.log("  → https://sepolia-blockscout.lisk.com/address/" + diamondLoupeFacetAddress);
  }
  
  console.log("OwnershipFacet:", ownershipFacetAddress);
  if (network.name === "lisk") {
    console.log("  → https://sepolia-blockscout.lisk.com/address/" + ownershipFacetAddress);
  }
  
  console.log("ERC20Facet:", erc20FacetAddress);
  if (network.name === "lisk") {
    console.log("  → https://sepolia-blockscout.lisk.com/address/" + erc20FacetAddress);
  }
  
  console.log("SwapFacet:", swapFacetAddress);
  if (network.name === "lisk") {
    console.log("  → https://sepolia-blockscout.lisk.com/address/" + swapFacetAddress);
  }
  
  console.log("MultiSigFacet:", multiSigFacetAddress);
  if (network.name === "lisk") {
    console.log("  → https://sepolia-blockscout.lisk.com/address/" + multiSigFacetAddress);
  }
  
  console.log("TokenURIFacet:", tokenURIFacetAddress);
  if (network.name === "lisk") {
    console.log("  → https://sepolia-blockscout.lisk.com/address/" + tokenURIFacetAddress);
  }
  
  console.log("DiamondInit:", diamondInitAddress);
  if (network.name === "lisk") {
    console.log("  → https://sepolia-blockscout.lisk.com/address/" + diamondInitAddress);
  }
  
  return {
    diamond: diamondAddress,
    facets: {
      DiamondCutFacet: diamondCutFacetAddress,
      DiamondLoupeFacet: diamondLoupeFacetAddress,
      OwnershipFacet: ownershipFacetAddress,
      ERC20Facet: erc20FacetAddress,
      SwapFacet: swapFacetAddress,
      MultiSigFacet: multiSigFacetAddress,
      TokenURIFacet: tokenURIFacetAddress,
      DiamondInit: diamondInitAddress
    }
  };
}

// Helper function to get selectors
function getSelectors(contract) {
  const signatures = Object.keys(contract.interface.fragments).filter(key => {
    const fragment = contract.interface.fragments[key];
    return fragment.type === 'function';
  }).map(key => contract.interface.fragments[key].format('sighash'));
  
  const selectors = signatures.reduce((acc, val) => {
    if (val !== "init(bytes)") {
      const selector = contract.interface.getFunction(val).selector;
      acc.push(selector);
    }
    return acc;
  }, []);
  return selectors;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main, getSelectors };
