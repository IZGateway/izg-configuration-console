import ConfigConsoleFetchRepository from './ConfigConsoleFetchRepository';
import ConfigConsoleMutateRepository from './ConfigConsoleMutateRepository';

export default interface DbClient extends ConfigConsoleFetchRepository, ConfigConsoleMutateRepository {
    /** returns the base repository of any forwarding agent */
    getRepository(): DbClient;
}
