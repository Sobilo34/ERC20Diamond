const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying Diamond with account:", deployerAddress);
  console.log("Account balance:", (await ethers.provider.getBalance(deployerAddress)).toString());

  // Deploy facets
  console.log("\n🔹 Deploying Facets...");
  
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.waitForDeployment();
  const diamondCutFacetAddress = await diamondCutFacet.getAddress();
  console.log("✅ DiamondCutFacet deployed to:", diamondCutFacetAddress);

  const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
  const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
  await diamondLoupeFacet.waitForDeployment();
  const diamondLoupeFacetAddress = await diamondLoupeFacet.getAddress();
  console.log("✅ DiamondLoupeFacet deployed to:", diamondLoupeFacetAddress);

  const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
  const ownershipFacet = await OwnershipFacet.deploy();
  await ownershipFacet.waitForDeployment();
  const ownershipFacetAddress = await ownershipFacet.getAddress();
  console.log("✅ OwnershipFacet deployed to:", ownershipFacetAddress);

  const ERC20Facet = await ethers.getContractFactory("ERC20Facet");
  const erc20Facet = await ERC20Facet.deploy();
  await erc20Facet.waitForDeployment();
  const erc20FacetAddress = await erc20Facet.getAddress();
  console.log("✅ ERC20Facet deployed to:", erc20FacetAddress);

  const SwapFacet = await ethers.getContractFactory("SwapFacet");
  const swapFacet = await SwapFacet.deploy();
  await swapFacet.waitForDeployment();
  const swapFacetAddress = await swapFacet.getAddress();
  console.log("✅ SwapFacet deployed to:", swapFacetAddress);

  const MultiSigFacet = await ethers.getContractFactory("MultiSigFacet");
  const multiSigFacet = await MultiSigFacet.deploy();
  await multiSigFacet.waitForDeployment();
  const multiSigFacetAddress = await multiSigFacet.getAddress();
  console.log("✅ MultiSigFacet deployed to:", multiSigFacetAddress);

  const TokenURIFacet = await ethers.getContractFactory("TokenURIFacet");
  const tokenURIFacet = await TokenURIFacet.deploy();
  await tokenURIFacet.waitForDeployment();
  const tokenURIFacetAddress = await tokenURIFacet.getAddress();
  console.log("✅ TokenURIFacet deployed to:", tokenURIFacetAddress);

  // Deploy Diamond
  console.log("\n🔹 Deploying Diamond...");
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(deployerAddress, diamondCutFacetAddress);
  await diamond.waitForDeployment();
  const diamondAddress = await diamond.getAddress();
  console.log("✅ Diamond deployed to:", diamondAddress);

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
  console.log("\n🔹 Deploying DiamondInit...");
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.waitForDeployment();
  const diamondInitAddress = await diamondInit.getAddress();
  console.log("✅ DiamondInit deployed to:", diamondInitAddress);

  // Prepare initialization data
  const initArgs = {
    name: "BLL Token",
    symbol: "BLL",
    initialSupply: ethers.parseEther("1000000"), // 1 million tokens
    tokenPriceInWei: ethers.parseEther("0.001"), // 0.001 ETH per token
    description: "BLL Token - A fully upgradeable diamond proxy ERC20 token with swap, multisig, and onchain SVG capabilities",
    externalUrl: "https://bll-token.example.com",
    backgroundColor: "667eea"
  };

  const functionCall = diamondInit.interface.encodeFunctionData("init", [initArgs]);

  // Execute diamond cut with initialization
  console.log("\n🔹 Adding facets to diamond...");
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamondAddress);
  const tx = await diamondCut.diamondCut(cuts, diamondInitAddress, functionCall);
  console.log("Diamond cut tx:", tx.hash);
  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  console.log("✅ Diamond cut completed");

  // Verify deployment
  console.log("\n🔹 Verifying deployment...");
  const erc20 = await ethers.getContractAt("ERC20Facet", diamondAddress);
  console.log("Token Name:", await erc20.name());
  console.log("Token Symbol:", await erc20.symbol());
  console.log("Token Decimals:", await erc20.decimals());
  console.log("Total Supply:", ethers.formatEther(await erc20.totalSupply()));
  console.log("Owner Balance:", ethers.formatEther(await erc20.balanceOf(deployerAddress)));

  const swap = await ethers.getContractAt("SwapFacet", diamondAddress);
  console.log("Token Price (wei):", (await swap.getTokenPrice()).toString());
  console.log("Swap Enabled:", await swap.isSwapEnabled());

  const tokenURI = await ethers.getContractAt("TokenURIFacet", diamondAddress);
  console.log("\n🎨 Token URI (first 100 chars):", (await tokenURI.tokenURI()).substring(0, 100) + "...");

  console.log("\n🎉 Diamond deployment complete!");
  console.log("📝 Diamond address:", diamondAddress);
  
  return {
    diamond: diamondAddress,
    facets: {
      DiamondCutFacet: diamondCutFacetAddress,
      DiamondLoupeFacet: diamondLoupeFacetAddress,
      OwnershipFacet: ownershipFacetAddress,
      ERC20Facet: erc20FacetAddress,
      SwapFacet: swapFacetAddress,
      MultiSigFacet: multiSigFacetAddress,
      TokenURIFacet: tokenURIFacetAddress
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
