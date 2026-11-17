import test from 'node:test'
import assert from 'node:assert/strict'
import {historyClubs,recentParticipation,historySquadSummary} from '../lib/athlete-history-view.mjs'
test('club presentation preserves year lists and participation never infers missing or ambiguous counts',()=>{
 assert.deepEqual(historyClubs('Clube A (2013, 2014); Clube B\nClube C'),['Clube A (2013, 2014)','Clube B','Clube C'])
 assert.equal(recentParticipation({gamesSixMonths:30,minutesSixMonths:2094}).average,69.8)
 for(const answers of [{gamesSixMonths:0,minutesSixMonths:0},{gamesSixMonths:'30 jogos',minutesSixMonths:2094},{gamesSixMonths:30,minutesSixMonths:'2.094'},{}])assert.equal(recentParticipation(answers).average,null)
 const s=historySquadSummary([{id:1},{id:2},{id:3}],[{athlete_id:1,is_current:true,answers:{position:'ZAG',dominantFoot:'Destro'}},{athlete_id:1,is_current:false,answers:{position:'GK'}},{athlete_id:2,is_current:true,answers:{position:'ZAG',dominantFoot:'Canhoto'}}])
 assert.equal(s.answered,2);assert.equal(s.pending,1);assert.deepEqual(s.positions,[{label:'Zagueiro',value:2}]);assert.equal(s.percent,67)
})
