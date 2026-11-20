import {normalizeName} from './wellness-data.mjs'

// Match a registered identity or an explicit alias. Similar first names alone
// never identify an athlete: Robert and Robson must remain distinct.
export function createAthleteNameResolver(athletes=[],aliases=[]) {
  const roster=new Map(),links=new Map()
  for(const athlete of athletes) {
    for(const name of [athlete.name,athlete.full_name]) {
      const key=normalizeName(name);if(!key)continue
      if(!roster.has(key))roster.set(key,new Map())
      roster.get(key).set(athlete.id??athlete.name,athlete.name)
    }
  }
  for(const alias of aliases) {
    const key=normalizeName(alias.gps_name),target=String(alias.bem_name||'').trim()
    if(!key||!normalizeName(target)||key===normalizeName(target))continue
    if(!links.has(key))links.set(key,new Map())
    links.get(key).set(normalizeName(target),target)
  }
  return name=>{
    const original=String(name||'').trim();let candidate=original;const seen=new Set()
    while(candidate) {
      const key=normalizeName(candidate);if(seen.has(key))return original;seen.add(key)
      const matches=roster.get(key)
      if(matches)return matches.size===1?[...matches.values()][0]:original
      const targets=links.get(key)
      if(!targets)return candidate
      if(targets.size!==1)return original
      candidate=[...targets.values()][0]
    }
    return original
  }
}

export function canonicalizeAthleteRows(rows,resolveName) {
  return rows.map(row=>{
    const name=resolveName(row.playerName)
    return name===row.playerName?row:{...row,playerName:name,_originalName:row._originalName||row.playerName,_normalizedName:normalizeName(name)}
  })
}
