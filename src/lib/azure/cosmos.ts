import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

export interface CosmosConfig {
  endpoint: string;
  database: string;
  container: string;
}


const getCosmosConfig = (): CosmosConfig | null => {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const database = process.env.COSMOS_DATABASE;
  const container = process.env.COSMOS_CONTAINER;
  if (!endpoint || !database || !container) {
    return null;
  }
  return { endpoint, database, container };
};

let cosmosClient: CosmosClient | null = null;

export const getCosmosContainer = () => {
  const config = getCosmosConfig();
  if (!config) {
    return null;
  }
  if (!cosmosClient) {
    cosmosClient = new CosmosClient({
      endpoint: config.endpoint,
      aadCredentials: new DefaultAzureCredential(),
    });
  }
  return cosmosClient.database(config.database).container(config.container);
};

export { getCosmosConfig };
