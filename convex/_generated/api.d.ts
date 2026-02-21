/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as checkIns from "../checkIns.js";
import type * as comprehension from "../comprehension.js";
import type * as fix from "../fix.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as matches from "../matches.js";
import type * as messages from "../messages.js";
import type * as seed from "../seed.js";
import type * as sessionMembers from "../sessionMembers.js";
import type * as sessions from "../sessions.js";
import type * as teaching from "../teaching.js";
import type * as users from "../users.js";
import type * as whiteboard from "../whiteboard.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  checkIns: typeof checkIns;
  comprehension: typeof comprehension;
  fix: typeof fix;
  groups: typeof groups;
  http: typeof http;
  matches: typeof matches;
  messages: typeof messages;
  seed: typeof seed;
  sessionMembers: typeof sessionMembers;
  sessions: typeof sessions;
  teaching: typeof teaching;
  users: typeof users;
  whiteboard: typeof whiteboard;
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
