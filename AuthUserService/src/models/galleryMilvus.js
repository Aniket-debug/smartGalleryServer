const { DataType } = require('@zilliz/milvus2-sdk-node');
const client = require("../config/milvus")();

const collectionName = "gallery_images";

async function createCollectionIfNotExists() {
    try {
        const collections = await client.showCollections();

        const exists = collections.data.some(col => col.name === collectionName);

        if (exists) {
            console.log(`✅ Collection "${collectionName}" already exists.`);
            return;
        }

        const dim = 512;

        const params = {
            collection_name: collectionName,
            fields: [
                {
                    name: "id",
                    description: "primary key",
                    data_type: DataType.Int64,
                    is_primary_key: true,
                    autoID: true,
                },
                {
                    name: "user_id",
                    description: "User ID",
                    data_type: DataType.VarChar,
                    max_length: 64,
                },
                {
                    name: "url",
                    description: "Image URL",
                    data_type: DataType.VarChar,
                    max_length: 512,
                },
                {
                    name: "metadata_id",
                    description: "Custom UUID for lookup",
                    data_type: DataType.VarChar,
                    max_length: 64,
                },
                {
                    name: "embedding",
                    description: "Image embedding vector",
                    data_type: DataType.FloatVector,
                    type_params: {
                        dim: dim.toString(),
                    },
                },
            ],
        };

        await client.createCollection(params);
        console.log(`✅ Collection "${collectionName}" created.`);

        await client.createIndex({
            collection_name: "gallery_images",
            field_name: "embedding",
            index_name: "embedding_index",
            index_type: "IVF_FLAT",
            metric_type: "IP",
            params: {
                nlist: 1024,
            },
        });

        await client.loadCollection({ collection_name: "gallery_images" });


    } catch (err) {
        console.error("❌ Failed to create Milvus collection:", err);
    }
}

module.exports = createCollectionIfNotExists;
