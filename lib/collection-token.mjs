import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto'
export function newCollectionConfig(){return{nonce:randomBytes(24).toString('base64url'),enabled:true}}
export function collectionToken(seasonId,nonce,secret){if(!secret)throw new Error('Configuração de acesso indisponível.');return `${nonce}.${createHmac('sha256',secret).update(`athraven-collection:${seasonId}:${nonce}`).digest('base64url')}`}
export function validCollectionToken(token,seasonId,secret){if(!secret||typeof token!=='string'||! /^[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(token))return false;return timingSafeEqual(Buffer.from(token),Buffer.from(collectionToken(seasonId,token.split('.')[0],secret)))}
export function activeCollectionToken(token,config){return !!config?.enabled&&typeof token==='string'&&token.split('.')[0]===config.nonce}
export function collectionPath(seasonId,config,secret){return `/coleta/${seasonId}#acesso=${collectionToken(seasonId,config.nonce,secret)}`}
