const { MilvusClient } = require("@zilliz/milvus2-sdk-node");

const connectMilvus = () => {
  const address = process.env.MILVUS_PUBLIC_KEY;
  const token = process.env.MILVUS_TOKEN;

  const client = new MilvusClient({ address, token });
  console.log("✅ Milvus client initialized");

  return client;
};

module.exports = connectMilvus;
