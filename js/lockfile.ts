import type { ByteBuffer } from "peechy";

export namespace TestSchema {
  type byte = number;
  type float = number;
  type int = number;
  type alphanumeric = string;
  type uint = number;
  type int8 = number;
  type lowp = number;
  type int16 = number;
  type int32 = number;
  type float32 = number;
  type uint16 = number;
  type uint32 = number;
  export enum PackageProvider {
    npm = 1,
    git = 2,
    https = 3,
    tgz = 4,
    other = 5,
  }
  export const PackageProviderKeys = {
    1: "npm",
    npm: "npm",
    2: "git",
    git: "git",
    3: "https",
    https: "https",
    4: "tgz",
    tgz: "tgz",
    5: "other",
    other: "other",
  };
  export enum ExportsType {
    commonJs = 1,
    esModule = 2,
    browser = 3,
  }
  export const ExportsTypeKeys = {
    1: "commonJs",
    commonJs: "commonJs",
    2: "esModule",
    esModule: "esModule",
    3: "browser",
    browser: "browser",
  };
  export type timestamp = string;
  export enum ErrorCode {
    generic = 1,
    missingPackageName = 2,
    serverDown = 3,
    versionDoesntExit = 4,
  }
  export const ErrorCodeKeys = {
    1: "generic",
    generic: "generic",
    2: "missingPackageName",
    missingPackageName: "missingPackageName",
    3: "serverDown",
    serverDown: "serverDown",
    4: "versionDoesntExit",
    versionDoesntExit: "versionDoesntExit",
  };
  export interface ExportsManifest {
    source: alphanumeric[];
    destination: alphanumeric[];
    exportType: ExportsType[];
  }

  export interface Version {
    major: int;
    minor: int;
    patch: int;
    pre: string;
    build: string;
  }

  export interface JavascriptPackageInput {
    name?: alphanumeric;
    version?: string;
    dependencies?: RawDependencyList;
  }

  export interface RawDependencyList {
    count: uint;
    names: alphanumeric[];
    versions: string[];
  }

  export interface JavascriptPackageManifest {
    count: uint;
    name: alphanumeric[];
    version: Version[];
    providers: PackageProvider[];
    dependencies: uint[];
    dependenciesIndex: uint[];
    exportsManifest: ExportsManifest;
    exportsManifestIndex: uint[];
  }

  export interface JavascriptPackageRequest {
    clientVersion?: string;
    name?: alphanumeric;
    dependencies?: RawDependencyList;
    optionalDependencies?: RawDependencyList;
    devDependencies?: RawDependencyList;
    peerDependencies?: RawDependencyList;
  }

  export interface JavascriptPackageResponse {
    name?: alphanumeric;
    result?: JavascriptPackageManifest;
    errorCode?: ErrorCode;
    message?: string;
  }

  export declare function encodeExportsManifest(
    message: ExportsManifest,
    bb: ByteBuffer
  ): void;
  export declare function decodeExportsManifest(
    buffer: ByteBuffer
  ): ExportsManifest;
  export declare function encodeVersion(message: Version, bb: ByteBuffer): void;
  export declare function decodeVersion(buffer: ByteBuffer): Version;
  export declare function encodeJavascriptPackageInput(
    message: JavascriptPackageInput,
    bb: ByteBuffer
  ): void;
  export declare function decodeJavascriptPackageInput(
    buffer: ByteBuffer
  ): JavascriptPackageInput;
  export declare function encodeRawDependencyList(
    message: RawDependencyList,
    bb: ByteBuffer
  ): void;
  export declare function decodeRawDependencyList(
    buffer: ByteBuffer
  ): RawDependencyList;
  export declare function encodeJavascriptPackageManifest(
    message: JavascriptPackageManifest,
    bb: ByteBuffer
  ): void;
  export declare function decodeJavascriptPackageManifest(
    buffer: ByteBuffer
  ): JavascriptPackageManifest;
  export declare function encodeJavascriptPackageRequest(
    message: JavascriptPackageRequest,
    bb: ByteBuffer
  ): void;
  export declare function decodeJavascriptPackageRequest(
    buffer: ByteBuffer
  ): JavascriptPackageRequest;
  export declare function encodeJavascriptPackageResponse(
    message: JavascriptPackageResponse,
    bb: ByteBuffer
  ): void;
  export declare function decodeJavascriptPackageResponse(
    buffer: ByteBuffer
  ): JavascriptPackageResponse;
}
