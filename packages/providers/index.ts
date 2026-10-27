/// <reference path="./types.d.ts" />

import tfRouterLanguage from "./src/language/tfRouter";
import deepSeek from "./src/language/deepSeek";
import grok2ApiLanguage from "./src/language/grok2Api";
import tfRouterMedia from "./src/media/tfRouter";
import apiMart from "./src/media/apiMart";
import metaso from "./src/media/metaso";
import compshare from "./src/media/compshare";
import grok2ApiMedia from "./src/media/grok2Api";
import chatgpt2Api from "./src/media/chatgpt2Api";
import flow2Api from "./src/media/flow2Api";

export type Provider = ProviderDefinition;
export type ProviderPrice = NonNullable<Awaited<ReturnType<NonNullable<Provider["getPrice"]>>>>;
export type ProviderPriceRequest = Parameters<NonNullable<Provider["getPrice"]>>[0];
export type ProviderPriceReference = NonNullable<ProviderPriceRequest["images"]>[number];
export type ProviderBalance = Awaited<ReturnType<NonNullable<Provider["getBalance"]>>>;
export type ProviderTools = ProviderContext["tool"];
export type AudioConvertOptions = Parameters<ProviderTools["audio"]["convert"]>[1];
export type { FfmpegFactory, FfmpegCommand } from "@toonflow/ffmpeg/types";

export const languageProviders = [tfRouterLanguage, deepSeek, grok2ApiLanguage] as const;
export const mediaProviders = [tfRouterMedia, apiMart, metaso, compshare, grok2ApiMedia, chatgpt2Api, flow2Api] as const;
