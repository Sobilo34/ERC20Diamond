import { ethers } from "hardhat";
import { expect } from "chai";

// Remove typechain-types import if not generated
// import { DiamondProxyContract, ERC20Facet } from "../typechain-types";
// Use ethers.Contract for contract instances

describe("ERC20 Diamond", function () {
  let diamond: any;
  let erc20Facet: any;
  let erc20: any;
  let owner: any;
  let user1: any;
  let user2: any;

  const TOKEN_NAME = "BLL Token";
  const TOKEN_SYMBOL = "BLL";
  const MAX_SUPPLY = ethers.utils.parseEther("1000000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Diamond
    const Diamond = await ethers.getContractFactory("DiamondProxyContract");
  diamond = await Diamond.deploy();
  await diamond.deployed();

    // Deploy ERC20Facet
    const ERC20Facet = await ethers.getContractFactory("ERC20Facet");
  erc20Facet = await ERC20Facet.deploy();
  await erc20Facet.deployed();

    // Get function selectors
    const selectors = [
      "initialize(string,string,uint256)",
      "name()",
      "symbol()",
      "decimals()",
      "totalSupply()",
      "maxSupply()",
      "balanceOf(address)",
      "allowance(address,address)",
      "approve(address,uint256)",
      "transfer(address,uint256)",
      "transferFrom(address,address,uint256)",
      "mint(address,uint256)",
      "burn(uint256)"
  ].map(fn => ethers.utils.id(fn).substring(0, 10));

    // Add facet to diamond
  await diamond.addFacet(erc20Facet.address, selectors);

    // Connect to diamond through ERC20Facet interface
  erc20 = await ethers.getContractAt("ERC20Facet", diamond.address);

    // Initialize
    await erc20.initialize(TOKEN_NAME, TOKEN_SYMBOL, MAX_SUPPLY);
  });

  describe("Initialization", function () {
    it("Should set the correct name", async function () {
      expect(await erc20.name()).to.equal(TOKEN_NAME);
    });

    it("Should set the correct symbol", async function () {
      expect(await erc20.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should set the correct decimals", async function () {
      expect(await erc20.decimals()).to.equal(18);
    });

    it("Should set the correct max supply", async function () {
      expect(await erc20.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it("Should start with zero total supply", async function () {
      expect(await erc20.totalSupply()).to.equal(0);
    });

    it("Should not allow re-initialization", async function () {
      await expect(
        erc20.initialize(TOKEN_NAME, TOKEN_SYMBOL, MAX_SUPPLY)
      ).to.be.revertedWith("Already initialized");
    });
  });

  describe("Minting", function () {
    it("Should mint tokens to an account", async function () {
  const amount = ethers.utils.parseEther("100");
      await erc20.mint(user1.address, amount);

      expect(await erc20.balanceOf(user1.address)).to.equal(amount);
      expect(await erc20.totalSupply()).to.equal(amount);
    });

    it("Should not exceed max supply", async function () {
  const amount = MAX_SUPPLY.add(1);
      await expect(
        erc20.mint(user1.address, amount)
      ).to.be.revertedWith("ERC20: exceeds max supply");
    });

    it("Should emit Transfer event on mint", async function () {
      const amount = ethers.utils.parseEther("100");
      await expect(erc20.mint(user1.address, amount))
        .to.emit(erc20, "Transfer")
        .withArgs(ethers.constants.AddressZero, user1.address, amount);
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
  await erc20.mint(user1.address, ethers.utils.parseEther("1000"));
    });

    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.utils.parseEther("100");
      await erc20.connect(user1).transfer(user2.address, amount);

      expect(await erc20.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("900")
      );
      expect(await erc20.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should fail if sender has insufficient balance", async function () {
  const amount = ethers.utils.parseEther("2000");
      await expect(
        erc20.connect(user1).transfer(user2.address, amount)
      ).to.be.revertedWith("ERC20: insufficient balance");
    });

    it("Should emit Transfer event", async function () {
      const amount = ethers.utils.parseEther("100");
      await expect(erc20.connect(user1).transfer(user2.address, amount))
        .to.emit(erc20, "Transfer")
        .withArgs(user1.address, user2.address, amount);
    });
  });

  describe("Approvals", function () {
    it("Should approve tokens for delegated transfer", async function () {
  const amount = ethers.utils.parseEther("100");
  await erc20.connect(user1).approve(user2.address, amount);

  expect(await erc20.allowance(user1.address, user2.address)).to.equal(amount);
    });

    it("Should emit Approval event", async function () {
      const amount = ethers.utils.parseEther("100");
      await expect(erc20.connect(user1).approve(user2.address, amount))
        .to.emit(erc20, "Approval")
        .withArgs(user1.address, user2.address, amount);
    });
  });

  describe("TransferFrom", function () {
    beforeEach(async function () {
  await erc20.mint(user1.address, ethers.utils.parseEther("1000"));
  await erc20.connect(user1).approve(user2.address, ethers.utils.parseEther("500"));
    });

    it("Should transfer tokens using allowance", async function () {
      const amount = ethers.utils.parseEther("100");
      await erc20.connect(user2).transferFrom(user1.address, user2.address, amount);

      expect(await erc20.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("900")
      );
      expect(await erc20.balanceOf(user2.address)).to.equal(amount);
      expect(await erc20.allowance(user1.address, user2.address)).to.equal(
        ethers.utils.parseEther("400")
      );
    });

    it("Should fail if allowance is insufficient", async function () {
  const amount = ethers.utils.parseEther("600");
      await expect(
        erc20.connect(user2).transferFrom(user1.address, user2.address, amount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
  await erc20.mint(user1.address, ethers.utils.parseEther("1000"));
    });

    it("Should burn tokens from caller", async function () {
      const amount = ethers.utils.parseEther("100");
      await erc20.connect(user1).burn(amount);

      expect(await erc20.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("900")
      );
      expect(await erc20.totalSupply()).to.equal(ethers.utils.parseEther("900"));
    });

    it("Should fail if balance is insufficient", async function () {
  const amount = ethers.utils.parseEther("2000");
      await expect(
        erc20.connect(user1).burn(amount)
      ).to.be.revertedWith("ERC20: burn exceeds balance");
    });

    it("Should emit Transfer event on burn", async function () {
      const amount = ethers.utils.parseEther("100");
      await expect(erc20.connect(user1).burn(amount))
        .to.emit(erc20, "Transfer")
        .withArgs(user1.address, ethers.constants.AddressZero, amount);
    });
  });

  describe("Diamond functionality", function () {
    it("Should return correct facet address for selectors", async function () {
  const selector = ethers.utils.id("name()").substring(0, 10);
      expect(await diamond.facetAddress(selector)).to.equal(
        erc20Facet.address
      );
    });

    it("Should list all selectors", async function () {
      const selectors = await diamond.facetSelectors();
      expect(selectors.length).to.be.greaterThan(0);
    });
  });
});