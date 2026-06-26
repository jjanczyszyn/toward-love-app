/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as allowlist from "../allowlist.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as blocks from "../blocks.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as hides from "../hides.js";
import type * as matching from "../matching.js";
import type * as messages from "../messages.js";
import type * as migrate from "../migrate.js";
import type * as seed from "../seed.js";
import type * as ses from "../ses.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  allowlist: typeof allowlist;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  blocks: typeof blocks;
  feedback: typeof feedback;
  files: typeof files;
  hides: typeof hides;
  matching: typeof matching;
  messages: typeof messages;
  migrate: typeof migrate;
  seed: typeof seed;
  ses: typeof ses;
  users: typeof users;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
