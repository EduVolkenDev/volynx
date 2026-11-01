import test from 'node:test';
import assert from 'node:assert/strict';
import { safeExternalUrl, salaryLabel, isOpportunityOpen } from './opportunities.ts';
test('application URLs reject executable protocols and embedded credentials',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,test','http://example.com','https://user:pass@example.com','not a URL'])assert.equal(safeExternalUrl(value),null);
 assert.equal(safeExternalUrl('https://example.com/jobs?ref=world'),'https://example.com/jobs?ref=world');
});
test('expired and closed listings cannot accept applications',()=>{
 const now=Date.parse('2026-11-01T12:00:00Z');
 assert.equal(isOpportunityOpen({status:'published',expires_at:'2026-11-01T12:00:00Z'},now),false);
 assert.equal(isOpportunityOpen({status:'closed',expires_at:'2026-12-01T00:00:00Z'},now),false);
 assert.equal(isOpportunityOpen({status:'published',expires_at:'2026-12-01T00:00:00Z'},now),true);
});
test('compensation distinguishes undisclosed, zero and one-sided ranges',()=>{
 const base={salary_min:null,salary_max:null,currency:'GBP',salary_period:'hour'};
 assert.equal(salaryLabel(base),'Compensation not disclosed');
 assert.match(salaryLabel({...base,salary_min:0,salary_max:2500}),/£0.*£25 \/ hour/);
 assert.equal(salaryLabel({...base,salary_min:2500}),'From £25 / hour');
 assert.equal(salaryLabel({...base,salary_max:2500}),'Up to £25 / hour');
 assert.equal(salaryLabel(base,'pt-BR'),'Remuneração não informada');
});
