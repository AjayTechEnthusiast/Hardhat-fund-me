const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains } = require("../../helper-hardhat-config");
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Fund me", async function () {
      let fundMe;
      let deployer;
      let MockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1");
      beforeEach(async function () {
        // const accounts = await ethers.getSigner() //return accounts
        // const accountZero = accounts[0]
        deployer = (await getNamedAccounts()).deployer;

        await deployments.fixture("all");
        fundMe = await ethers.getContract("FundMe", deployer);
        MockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });
      describe("Constructor", async function () {
        it("Should sets the aggregator addresses correctly", async function () {
          const response = await fundMe.priceFeed();
          assert.equal(response, MockV3Aggregator.address);
        });
      });
      describe("Fund", async function () {
        it("Should fail if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith("Didn't send enough!");
        });
        it("Should update the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.addressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });
        it("Should add funders to array of funders", async function () {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.funders(0);
          assert.equal(funder, deployer);
        });
      });
      describe("Withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
          const deployerBalance = await fundMe.provider.getBalance(deployer);
          //or await ethers.provider.getBalance(deployer);
          const fundmeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
        });
        it("Should withdraw ETH from a single funder", async function () {
          const startingFundmeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundmeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });
        it("Should allow us to withdraw with multiple funders", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundmeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundmeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
          await expect(fundMe.funders(0)).to.be.reverted;
          const val = await fundMe.addressToAmountFunded(accounts[1].address);
          console.log(val.toString());
          for (let i = 1; i < 6; i++) {
            assert.equal(
              (
                await fundMe.addressToAmountFunded(accounts[i].address)
              ).toString(),
              "0"
            );
          }
        });
        it("Should only allow the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);
          await expect(attackerConnectedContract.withdraw()).to.be.reverted;
        });
        it("Should allow cheaper withdraw", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundmeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundmeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
          await expect(fundMe.funders(0)).to.be.reverted;
          const val = await fundMe.addressToAmountFunded(accounts[1].address);
          console.log(val.toString());
          for (let i = 1; i < 6; i++) {
            assert.equal(
              (
                await fundMe.addressToAmountFunded(accounts[i].address)
              ).toString(),
              "0"
            );
          }
        });
      });
    });
