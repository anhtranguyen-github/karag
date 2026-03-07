import "@hey-api/client-fetch";
import type { Options as HeyApiOptions } from "@hey-api/client-fetch";

declare module "@hey-api/client-fetch" {
    export type OptionsLegacyParser<T = unknown, ThrowOnError extends boolean = boolean> = HeyApiOptions<T, ThrowOnError>;
}
