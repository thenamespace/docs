/**
 * Universal Usernames profile, schema version 1.
 * The JSON schema is in schema/profile-v1.schema.json.
 */
export interface UsernameProfileV1 {
  version: 1;
  /** The requested username, exactly as Namespace sent it. */
  username: string;
  /** ENS text records. Leave missing records out; never send null. */
  texts: Record<string, string>;
  /** Addresses keyed by decimal ENS coin type, such as "60" for Ethereum. */
  addresses: Record<string, string>;
  /** ipfs://, ipns://, bzz:// or ar:// URI. Omit when there is none. */
  contenthash?: string;
}
