/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assignments from "../assignments.js";
import type * as certificates from "../certificates.js";
import type * as community from "../community.js";
import type * as courses from "../courses.js";
import type * as dictionary from "../dictionary.js";
import type * as exams from "../exams.js";
import type * as files from "../files.js";
import type * as lib from "../lib.js";
import type * as migrate from "../migrate.js";
import type * as moderation from "../moderation.js";
import type * as progress from "../progress.js";
import type * as stats from "../stats.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assignments: typeof assignments;
  certificates: typeof certificates;
  community: typeof community;
  courses: typeof courses;
  dictionary: typeof dictionary;
  exams: typeof exams;
  files: typeof files;
  lib: typeof lib;
  migrate: typeof migrate;
  moderation: typeof moderation;
  progress: typeof progress;
  stats: typeof stats;
  users: typeof users;
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
