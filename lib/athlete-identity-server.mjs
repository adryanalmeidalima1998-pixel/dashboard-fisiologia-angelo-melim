import {sql} from './season-db.mjs'
import {createAthleteNameResolver} from './athlete-identity.mjs'
// Queries use the request's season transaction; aliases never cross clubs.
export async function readAthleteNameResolver(){
  const {rows:athletes}=await sql`SELECT id,name,full_name FROM athletes`
  const {rows:aliases}=await sql`SELECT gps_name,bem_name FROM name_aliases`
  return createAthleteNameResolver(athletes,aliases)
}
