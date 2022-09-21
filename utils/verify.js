async function verify(contractAAddress, args) {
  console.log("Verifying contracts....");
  try {
    await run("verify:verify", {
      address: contractAAddress,
      constructorArguments: args,
    });
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified");
    } else {
      console.log(e);
    }
  }
}
module.exports = { verify };
