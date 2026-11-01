import { getSupabaseClient } from '../lib/supabase-client';
import { ROUTES } from '../data/routes';
import { LABELS, APPLICATION_STATES, safeExternalUrl, isOpportunityOpen, salaryLabel } from '../lib/world/opportunities';
import type { SupabaseClient } from '@supabase/supabase-js';

const root = document.querySelector<HTMLElement>('[data-world-app]');
const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const pt = () => document.documentElement.lang.startsWith('pt');
const t = (en: string, br: string) => pt() ? br : en;
const label = (v: string) => LABELS[v]?.[pt() ? 1 : 0] || v;
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const date = (v: string) => new Intl.DateTimeFormat(pt() ? 'pt-BR' : 'en-GB', {dateStyle:'medium'}).format(new Date(v));
const detailUrl = (id: string) => `${ROUTES.worldOpportunityDetail}?id=${encodeURIComponent(id)}`;
const columns = 'id,title,company_name,description,category,kind,work_mode,location,eligibility,skills,salary_min,salary_max,currency,salary_period,source_name,source_url,application_url,source_published_at,last_checked_at,expires_at,status,created_at,updated_at';
let client: SupabaseClient;
let userId: string | null = null;
let items: any[] = [];
let activity = new Map<string, any>();
let page = 0;
let loading = false;
let request = 0;
const pageSize = 24;
function status(message: string, error = false) { const node = byId('worldStatus'); node.textContent = message; node.classList.toggle('error',error); }
function translateOptions() { document.querySelectorAll<HTMLOptionElement>('[data-label]').forEach(node=>node.textContent=label(node.dataset.label!)); }
function loginNotice() {
  byId('worldResults').innerHTML = `<div class="empty"><h2>${t('Keep your next steps together.','Reúna seus próximos passos.')}</h2><p>${t('Sign in to save opportunities and keep private application notes across devices.','Entre para salvar oportunidades e manter notas privadas de candidatura entre dispositivos.')}</p><a class="action primary" href="${ROUTES.login}?next=${encodeURIComponent(location.pathname + location.search)}">${t('Sign in','Entrar')}</a></div>`;
}
function card(item: any) {
  return `<article class="opportunity" data-id="${esc(item.id)}"><span class="company">${esc(item.company_name)}</span><h2><a href="${detailUrl(item.id)}">${esc(item.title)}</a></h2><div class="tags">${[item.category,item.kind,item.work_mode].map(v=>`<span>${esc(label(v))}</span>`).join('')}<span>${esc(item.location)}</span>${!isOpportunityOpen(item)?`<span>${t('Closed / expired','Encerrada / expirada')}</span>`:''}</div><p>${esc(salaryLabel(item,pt()?'pt-BR':'en-GB'))}</p><p class="muted">${esc(item.eligibility)}</p><p class="muted">${t('Last checked','Última conferência')}: ${esc(date(item.last_checked_at))} · ${esc(item.source_name)}</p><div class="actions"><a class="action" href="${detailUrl(item.id)}">${t('View opportunity','Ver oportunidade')}</a>${root?.dataset.worldApp==='admin'?`<button type="button" data-edit="${esc(item.id)}">${t('Edit','Editar')} · ${esc(label(item.status))}</button>`:''}</div></article>`;
}
function render() {
  translateOptions();
  const target = byId('worldResults');
  const mode = root?.dataset.worldApp;
  if (mode === 'detail') { renderDetail(); return; }
  if (mode === 'workspace' && !userId) { loginNotice(); return; }
  if (!items.length) {
    target.innerHTML = `<div class="empty"><h2>${mode==='workspace'?t('Your next chapter starts here.','Seu próximo capítulo começa aqui.'):t('No opportunities to show yet.','Nenhuma oportunidade para mostrar agora.')}</h2><p>${mode==='workspace'?t('Save an opportunity to track it here.','Salve uma oportunidade para acompanhá-la aqui.'):t('Try different filters or return later. Only reviewed, active listings appear in discovery.','Tente outros filtros ou volte depois. Apenas anúncios revisados e ativos aparecem na busca.')}</p><a class="action" href="${mode==='workspace'?ROUTES.worldOpportunities:ROUTES.world}">${mode==='workspace'?t('Explore opportunities','Explorar oportunidades'):t('Explore professionals & services','Explorar profissionais e serviços')}</a></div>`; return;
  }
  target.innerHTML = items.map(item=>{
    if(item.unavailable)return `<article class="opportunity"><h2>${t('Archived opportunity','Oportunidade arquivada')}</h2><p>${t('This listing is no longer public. Your private record can be removed below.','Este anúncio não está mais público. Você pode remover seu registro privado abaixo.')}</p><button type="button" data-remove="${esc(item.id)}">${t('Remove from My World','Remover do Meu World')}</button></article>`;
    const html = card(item);
    if (mode !== 'workspace') return html;
    const a = activity.get(item.id);
    return html.replace('</article>',`<div class="workspace-controls"><label>${t('Application stage','Etapa da candidatura')}<select data-stage="${esc(item.id)}">${APPLICATION_STATES.map(v=>`<option value="${v}" ${a.stage===v?'selected':''}>${esc(label(v))}</option>`).join('')}</select></label><label>${t('Private notes','Notas privadas')}<textarea maxlength="3000" data-notes="${esc(item.id)}">${esc(a.notes)}</textarea></label><div class="actions"><button type="button" data-update="${esc(item.id)}">${t('Save changes','Salvar alterações')}</button><button type="button" data-remove="${esc(item.id)}">${t('Remove from My World','Remover do Meu World')}</button></div></div></article>`);
  }).join('');
}
function renderDetail() {
  const item = items[0];
  if (!item) { byId('worldResults').innerHTML=`<div class="empty"><h1>${t('Opportunity unavailable','Oportunidade indisponível')}</h1><a class="action" href="${ROUTES.worldOpportunities}">${t('Browse opportunities','Explorar oportunidades')}</a></div>`; return; }
  const open = isOpportunityOpen(item);
  const source = safeExternalUrl(item.source_url);
  const application = safeExternalUrl(item.application_url);
  byId('worldResults').innerHTML=`<span class="eyebrow">${esc(item.company_name)}</span><h1>${esc(item.title)}</h1><div class="tags">${[item.category,item.kind,item.work_mode].map(v=>`<span>${esc(label(v))}</span>`).join('')}</div><div class="detail-grid"><section><h2>${t('The opportunity','A oportunidade')}</h2><div class="description">${esc(item.description)}</div><div class="tags">${item.skills.map((v:string)=>`<span>${esc(v)}</span>`).join('')}</div></section><aside><h2>${esc(salaryLabel(item,pt()?'pt-BR':'en-GB'))}</h2><dl><div><dt>${t('Location / time zone','Localização / fuso')}</dt><dd>${esc(item.location)}</dd></div><div><dt>${t('Eligibility','Elegibilidade')}</dt><dd>${esc(item.eligibility)}</dd></div><div><dt>${t('Source','Fonte')}</dt><dd>${source?`<a class="source-link" href="${esc(source)}" target="_blank" rel="noopener noreferrer">${esc(item.source_name)} ↗</a>`:esc(item.source_name)}</dd></div><div><dt>${t('Last checked','Última conferência')}</dt><dd>${esc(date(item.last_checked_at))}</dd></div><div><dt>${t('Listing expires','Validade do anúncio')}</dt><dd>${esc(date(item.expires_at))}</dd></div>${item.source_published_at?`<div><dt>${t('Original publication','Publicação original')}</dt><dd>${esc(date(item.source_published_at+'T12:00:00Z'))}</dd></div>`:''}</dl><p class="muted">${t('Check current conditions on the original source. Remote roles may have geographic restrictions.','Confira as condições atuais na fonte original. Vagas remotas podem ter restrições geográficas.')}</p><div class="actions">${open&&application?`<a class="action primary" href="${esc(application)}" target="_blank" rel="noopener noreferrer">${t('Apply at source','Candidatar na fonte')} ↗</a>`:`<p>${t('This listing is closed or expired.','Este anúncio está encerrado ou expirado.')}</p>`}${userId?(activity.has(item.id)?`<a class="action" href="${ROUTES.worldWorkspace}">${t('Saved · Open My World','Salva · Abrir Meu World')}</a>`:open?`<button type="button" data-save="${esc(item.id)}">${t('Save opportunity','Salvar oportunidade')}</button>`:''):`<a class="action" href="${ROUTES.login}?next=${encodeURIComponent(detailUrl(item.id))}">${t('Sign in to save','Entre para salvar')}</a>`}</div></aside></div><section class="preparation"><h2>${t('Prepare your application','Prepare sua candidatura')}</h2><p>${t('Review the requirements, adapt your CV and choose relevant portfolio work. Applying at the source does not automatically update your tracker.','Revise os requisitos, adapte seu currículo e selecione trabalhos relevantes do portfólio. Candidatar-se na fonte não atualiza automaticamente seu acompanhamento.')}</p><div class="actions"><a class="action" href="${ROUTES.cvitae}">CVitae ↗</a><a class="action" href="${ROUTES.world}#join-world">${t('My professional profile','Meu perfil profissional')}</a><a class="action" href="${ROUTES.portfolioKitPreview}">${t('Optional portfolio kit','Kit de portfólio opcional')}</a></div></section>`;
}
async function load(reset = true) {
  const mode = root?.dataset.worldApp;
  const current = ++request;
  loading = true;
  status(t('Loading opportunities…','Carregando oportunidades…'));
  if (reset) { page = 0; items = []; }
  try {
    if (mode === 'detail') {
      const id = new URLSearchParams(location.search).get('id') || '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) { items=[]; render(); status(''); return; }
      const {data,error} = await client.from('world_opportunities').select(columns).eq('id',id).maybeSingle();
      if(error) throw error;
      items=data?[data]:[];
      if(userId) { const {data: saved,error: saveError}=await client.from('world_opportunity_activity').select('*').eq('user_id',userId).eq('opportunity_id',id); if(saveError) throw saveError; activity=new Map((saved||[]).map(a=>[a.opportunity_id,a])); }
    } else if (mode === 'workspace') {
      if(!userId) { loginNotice(); status(''); return; }
      const {data,error}=await client.from('world_opportunity_activity').select(`*,opportunity:world_opportunities(${columns})`).eq('user_id',userId).order('updated_at',{ascending:false}).order('opportunity_id').range(page*pageSize,(page+1)*pageSize-1);
      if(error) throw error;
      if(reset)activity.clear();
      for(const a of data||[])activity.set(a.opportunity_id,a);
      const next=(data||[]).map(a=>a.opportunity||{id:a.opportunity_id,unavailable:true});
      items=reset?next:[...items,...next];
      byId('worldMore').hidden=(data?.length||0)<pageSize;
    } else {
      let query=client.from('world_opportunities').select(columns).order('created_at',{ascending:false}).order('id').range(page*pageSize,(page+1)*pageSize-1);
      if(mode!=='admin') {
        query=query.eq('status','published').gt('expires_at',new Date().toISOString());
        const form=byId<HTMLFormElement>('opportunityFilters');
        const filters=new FormData(form);
        for(const key of ['category','kind','work_mode']) if(filters.get(key)) query=query.eq(key,filters.get(key));
        const search=String(filters.get('search')||'').trim();
        if(search) query=query.textSearch('search_document',search,{type:'websearch',config:'simple'});
      }
      const {data,error}=await query;
      if(error) throw error;
      if(current!==request) return;
      items=reset?(data||[]):[...items,...(data||[])];
      byId('worldMore').hidden=(data?.length||0)<pageSize;
    }
    if(current!==request)return;
    render(); status(items.length?t(`${items.length} opportunity / opportunities loaded.`,`${items.length} oportunidade(s) carregada(s).`):'');
  } catch { if(current===request) { if(!reset)page=Math.max(0,page-1); status(t('Could not load opportunities. Please try again.','Não foi possível carregar as oportunidades. Tente novamente.'),true); byId('worldResults').innerHTML=`<button type="button" data-retry>${t('Try again','Tentar novamente')}</button>`; } }
  finally { if(current===request)loading=false; }
}
function editorReset() {
  const form=byId<HTMLFormElement>('opportunityEditor');form.reset();
  (form.elements.namedItem('id') as HTMLInputElement).value='';
  const local=(d:Date)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  (form.elements.namedItem('last_checked_at') as HTMLInputElement).value=local(new Date());
  (form.elements.namedItem('expires_at') as HTMLInputElement).value=local(new Date(Date.now()+14*86400000));
}
function edit(id:string) {
  const item=items.find(v=>v.id===id);if(!item)return;
  const form=byId<HTMLFormElement>('opportunityEditor');
  for(const [key,value] of Object.entries(item)) {
    const field=form.elements.namedItem(key) as HTMLInputElement | null;if(!field)continue;
    if(['last_checked_at','expires_at'].includes(key)){const d=new Date(String(value));field.value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
    else if(key==='skills')field.value=(value as string[]).join(', ');
    else if(key.startsWith('salary_')&&key!=='salary_period')field.value=value==null?'':String(Number(value)/100);
    else field.value=String(value??'');
  }
  form.scrollIntoView({behavior:'smooth',block:'start'});
}
async function init() {
  if(!root)return;
  translateOptions();
  client=await getSupabaseClient();
  const bridge=window as any;
  bridge.VxAuthBridge?.hydrate?.();
  await bridge.vxEnsureFreshToken?.().catch(()=>null);
  let stored:any={};try{stored=JSON.parse(localStorage.getItem('volynx_session')||'{}');}catch{}
  const access=localStorage.getItem('volynx_access_token')||stored.access_token;
  const refresh=localStorage.getItem('volynx_refresh_token')||stored.refresh_token;
  if(access&&refresh){const {data,error}=await client.auth.setSession({access_token:access,refresh_token:refresh});if(!error&&data.session){userId=data.session.user.id;localStorage.setItem('volynx_session',JSON.stringify(data.session));localStorage.setItem('volynx_access_token',data.session.access_token);localStorage.setItem('volynx_refresh_token',data.session.refresh_token);}}
  if(!userId){const {data}=await client.auth.getUser();userId=data.user?.id||null;}
  if(userId&&root.dataset.worldApp==='workspace'){const {data}=await client.rpc('is_platform_admin');if(data)byId('worldAdminLink').hidden=false;}
  if(root.dataset.worldApp==='admin'){
    if(!userId){loginNotice();status(t('Administrator sign-in required.','É necessário entrar como administrador.'),true);return;}
    const {data,error}=await client.rpc('is_platform_admin');
    if(error||!data){status(t('Administrator access required.','Acesso de administrador necessário.'),true);return;}
    byId('worldAdmin').hidden=false;editorReset();
  }
  client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){userId=null;activity.clear();items=[];byId('worldAdmin')?.setAttribute('hidden','');byId('worldAdminLink')?.setAttribute('hidden','');if(root?.dataset.worldApp==='admin'){byId('worldResults').replaceChildren();status(t('Administrator sign-in required.','É necessário entrar como administrador.'),true);}else render();}});
  await load();
  byId<HTMLFormElement>('opportunityFilters')?.addEventListener('submit',event=>{event.preventDefault();void load();});
  byId('worldMore')?.addEventListener('click',()=>{if(!loading){page++;void load(false);}});
  byId('newOpportunity')?.addEventListener('click',editorReset);
  byId<HTMLFormElement>('opportunityEditor')?.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget as HTMLFormElement;const button=form.querySelector<HTMLButtonElement>('[type=submit]')!;button.disabled=true;
    try{
      const f=new FormData(form);const payload:any={};
      for(const [key,value]of f.entries())if(key!=='id')payload[key]=String(value).trim();
      if(!safeExternalUrl(payload.source_url)||!safeExternalUrl(payload.application_url))throw new Error(t('Use valid HTTPS source and application URLs.','Use URLs HTTPS válidas para fonte e candidatura.'));
      payload.skills=payload.skills.split(',').map((v:string)=>v.trim()).filter(Boolean);
      for(const key of ['salary_min','salary_max'])payload[key]=payload[key]===''?null:Math.round(Number(payload[key])*100);
      payload.source_published_at=payload.source_published_at||null;
      for(const key of ['last_checked_at','expires_at'])payload[key]=new Date(payload[key]).toISOString();
      if(Date.parse(payload.expires_at)<=Date.parse(payload.last_checked_at))throw new Error(t('Expiration must follow the last check.','A validade deve ser posterior à última conferência.'));
      if(payload.status==='published'&&Date.parse(payload.expires_at)<=Date.now())throw new Error(t('Choose a future expiration before publishing.','Escolha uma validade futura antes de publicar.'));
      const id=String(f.get('id')||'');
      const {data,error}=await (id?client.from('world_opportunities').update(payload).eq('id',id):client.from('world_opportunities').insert(payload)).select('id').single();
      if(error||!data)throw new Error(t('Could not save. Check the required fields and your administrator session.','Não foi possível salvar. Confira os campos obrigatórios e sua sessão de administrador.'));
      editorReset();await load();status(t('Opportunity saved.','Oportunidade salva.'));
    }catch(error){status(error instanceof Error?error.message:t('Save failed.','Falha ao salvar.'),true);}finally{button.disabled=false;}
  });
  byId('worldResults').addEventListener('click',async event=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
    if(button.hasAttribute('data-retry')){void load();return;}
    if(button.dataset.edit){edit(button.dataset.edit);return;}
    const id=button.dataset.save||button.dataset.update||button.dataset.remove;if(!id||!userId)return;
    button.disabled=true;
    try{
      let result;
      if(button.dataset.remove)result=await client.from('world_opportunity_activity').delete().eq('user_id',userId).eq('opportunity_id',id).select('opportunity_id');
      else if(button.dataset.update){const article=button.closest('article')!;result=await client.from('world_opportunity_activity').update({stage:article.querySelector<HTMLSelectElement>('[data-stage]')!.value,notes:article.querySelector<HTMLTextAreaElement>('[data-notes]')!.value}).eq('user_id',userId).eq('opportunity_id',id).select('opportunity_id');}
      else result=await client.from('world_opportunity_activity').upsert({user_id:userId,opportunity_id:id},{onConflict:'user_id,opportunity_id',ignoreDuplicates:true}).select('opportunity_id');
      if(result.error)throw result.error;
      if(button.dataset.update&&!result.data?.length)throw new Error('No row updated');
      if(button.dataset.update){const a=activity.get(id);const article=button.closest('article')!;a.stage=article.querySelector<HTMLSelectElement>('[data-stage]')!.value;a.notes=article.querySelector<HTMLTextAreaElement>('[data-notes]')!.value;status(t('Changes saved.','Alterações salvas.'));}
      else await load();
    }catch{status(t('Could not save changes. Sign in again or try later.','Não foi possível salvar. Entre novamente ou tente depois.'),true);}finally{button.disabled=false;}
  });
  window.addEventListener('vx:lang-changed',()=>{
    // Preserve unsaved application edits while switching interface language.
    if(root?.dataset.worldApp==='workspace')for(const article of document.querySelectorAll<HTMLElement>('.opportunity[data-id]')){
      const draft=activity.get(article.dataset.id!);
      if(draft){draft.stage=article.querySelector<HTMLSelectElement>('[data-stage]')?.value||draft.stage;draft.notes=article.querySelector<HTMLTextAreaElement>('[data-notes]')?.value??draft.notes;}
    }
    render();
  });
  window.addEventListener('storage',event=>{if(['volynx_session','volynx_access_token'].includes(event.key||'')&&!event.newValue)location.reload();});
}
void init().catch(()=>status(t('Could not connect. Reload the page to try again.','Não foi possível conectar. Recarregue a página para tentar novamente.'),true));
