const { Client, PrivateKey, TopicCreateTransaction, TopicMessageSubmitTransaction, TopicMessageQuery, Hbar, TopicInfoQuery, TopicUpdateTransaction } = require("@hashgraph/sdk");
require('dotenv').config();

async function environmentSetup() {
    try {
        // Grab your Hedera testnet account ID and private key from your .env file
        const myAccountId = process.env.MY_ACCOUNT_ID;
        const myPrivateKey = process.env.MY_PRIVATE_KEY;

        // If we weren't able to grab it, we should throw a new error
        if (!myAccountId || !myPrivateKey) {
            throw new Error("Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present");
        }

        // Create your Hedera Testnet client
        const client = Client.forTestnet();

        // Set your account as the client's operator
        client.setOperator(myAccountId, PrivateKey.fromString(myPrivateKey));

        // Set the default maximum transaction fee (in Hbar)
        client.setDefaultMaxTransactionFee(new Hbar(100));

        // Set the maximum payment for queries (in Hbar)
        client.setMaxQueryPayment(new Hbar(50));

        // Create a new topic
        const txResponse = await new TopicCreateTransaction()
            .setSubmitKey(PrivateKey.fromString(myPrivateKey).publicKey)
            .setTopicMemo("first memo to go !")
            .execute(client);

        // Grab the newly generated topic ID
        const receipt = await txResponse.getReceipt(client);
        const topicId = receipt.topicId;
        console.log(`Your topic ID is: ${topicId}`);

        let topicInfo = await new TopicInfoQuery()
            .setTopicId(topicId)
            .execute(client);
        console.log(`Your memo is: ${topicInfo.topicMemo}`);

        // Create a transaction to update the memo of the topic
        let updateTx = await new TopicUpdateTransaction()
            .setTopicId(topicId)
            .setTopicMemo("this is an updated memo")
            .freezeWith(client)
            .sign(PrivateKey.fromString(myPrivateKey));

        // Execute the transaction to update the memo
        let updateTxResponse = await updateTx.execute(client);

        // Get the receipt of the transaction
        let updateReceipt = await updateTxResponse.getReceipt(client);

        // Check if the transaction was successful
        if (updateReceipt.status !== Status.Success) {
            throw new Error(`Failed to update memo for topic: ${updateReceipt.status.toString()}`);
        } 

        console.log(`Memo for topic ID ${topicId} updated successfully.`);

        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Subscribe to the topic
        new TopicMessageQuery()
            .setTopicId(topicId)
            .subscribe(client, (message) => {
                const messageAsString = Buffer.from(message.contents, "utf8").toString();
                console.log(`${message.consensusTimestamp.toDate()} Received: ${messageAsString}`);
            });

        // Send message to private topic
        const submitMsgTx = await new TopicMessageSubmitTransaction({
            topicId: topicId,
            message: "This is dodo!",
        })
            .freezeWith(client)
            .sign(PrivateKey.fromString(myPrivateKey));

        const submitMsgTxSubmit = await submitMsgTx.execute(client);

        // Get the receipt of the transaction
        const getReceipt = await submitMsgTxSubmit.getReceipt(client);

        // Get the status of the transaction
        const transactionStatus = getReceipt.status;
        console.log("The message transaction status: " + transactionStatus.toString());
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

environmentSetup();
