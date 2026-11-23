export const PROFILE_FIELDS=['birth_date','weight_kg','height_cm','city']
export function profileFormValues(athlete={}) {
  return {birth_date:String(athlete.birth_date||'').slice(0,10),weight_kg:String(athlete.weight_kg??''),height_cm:String(athlete.height_cm??''),city:athlete.city||''}
}
export function changedProfileFields(form,athlete) {
  const initial=profileFormValues(athlete)
  return Object.fromEntries(PROFILE_FIELDS.filter(key=>String(form[key]??'')!==initial[key]).map(key=>[key,form[key]]))
}
export function validateProfileUpdate(body,now=new Date()) {
  const result={}
  for(const key of PROFILE_FIELDS) {
    if(!Object.hasOwn(body,key))continue
    const value=body[key]
    if(value===null||value===''){result[key]=null;continue}
    if(key==='birth_date') {
      if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Informe uma data de nascimento válida.')
      const date=new Date(value+'T12:00:00Z'),today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(now)
      if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value||value<'1900-01-01'||value>today)throw new Error('Informe uma data de nascimento válida, sem data futura.')
      result[key]=value
    } else if(key==='city') {
      if(typeof value!=='string'||value.trim().length>255)throw new Error('Informe a cidade em até 255 caracteres.')
      result[key]=value.trim()||null
    } else {
      if(!['string','number'].includes(typeof value))throw new Error(key==='weight_kg'?'Informe um peso válido em kg.':'Informe uma altura válida em cm.')
      const text=String(value).trim().replace(',','.'),number=Number(text)
      if(!/^\d+(?:\.\d{1,2})?$/.test(text)||!Number.isFinite(number)||(key==='weight_kg'?(number<20||number>250):(number<100||number>250||!Number.isInteger(number))))throw new Error(key==='weight_kg'?'Informe o peso entre 20 e 250 kg, com até duas casas decimais.':'Informe a altura entre 100 e 250 cm, sem casas decimais.')
      result[key]=number
    }
  }
  return result
}

export function profileAge(birthDate,now=new Date()) {
  const birth=String(birthDate||'').slice(0,10)
  if(!/^\d{4}-\d{2}-\d{2}$/.test(birth))return null
  const date=new Date(birth+'T12:00:00Z')
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==birth)return null
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(now)
  const age=Number(today.slice(0,4))-Number(birth.slice(0,4))-(today.slice(5)<birth.slice(5)?1:0)
  return age>=0&&age<=125?age:null
}
