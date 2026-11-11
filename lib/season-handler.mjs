import { findSeason } from './seasons.mjs'
function failure(message,status) {
  return Response.json({error:message},{status,headers:{'Cache-Control':'private, no-store'}})
}
export function createSeasonHandler({ getSession, runDatabase, canonicalOrigin }) {
  return function withSeason(handler, { database = true } = {}) {
    return async (request, context) => {
      if (!(await getSession())) return failure('Entre na sua conta para continuar.',401)
      const season = findSeason(request.headers.get('x-season-id'))
      if (!season) return failure('Selecione uma temporada válida.',400)
      const origin = request.headers.get('origin')
      const expected = canonicalOrigin?.() || new URL(request.url).origin
      if (!['GET','HEAD'].includes(request.method) && origin && origin !== expected) return failure('Origem inválida.',403)
      try {
        const execute = () => handler(request,{...context,season})
        const response = database ? await runDatabase(season,execute) : await execute()
        response.headers.set('Cache-Control','private, no-store')
        response.headers.set('Vary','Cookie, X-Season-Id')
        response.headers.set('X-Season-Id',season.id)
        return response
      } catch (error) {
        console.error('Falha na consulta da temporada:',error.code || error.name)
        return failure('Não foi possível acessar os dados desta temporada. Confira a conexão com o banco.',503)
      }
    }
  }
}
